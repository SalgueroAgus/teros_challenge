# FinSight — AI-Powered Personal Finance Assistant



## Table of Contents

1. [Goal](#goal)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Setup & Run](#setup--run)
   - [Backend — local dev](#backend--local-dev)
   - [Frontend — Replit](#frontend--replit)
6. [API Reference](#api-reference)
7. [RAG Pipeline](#rag-pipeline)
8. [Database Migrations](#database-migrations)
9. [Configuration Reference](#configuration-reference)
10. [Deployment](#deployment)
11. [Claude Code Setup](#claude-code-setup)
12. [Project Structure](#project-structure)

---

## Goal

FinSight lets users upload financial documents (PDFs, CSVs, images) and chat with them in plain English. The system parses and indexes each document into a vector database, then answers questions by retrieving the most relevant passages and feeding them to an LLM.


---

## Architecture

```
┌─────────────────────────────────────────┐
│           User (browser)                │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       Next.js 15 — Replit               │
│  Dashboard · Documents · Chat           │
└──────────┬───────────────┬──────────────┘
           │               │
     upload file      ask question
           │               │
           ▼               ▼
┌─────────────────────────────────────────┐
│   FastAPI — AWS Lambda + API Gateway    │
│                                         │
│  POST /upload    ──►  parse             │
│                        chunk            │
│                        embed            │
│                        store ──────────┐│
│                                        ││
│  POST /query     ──►  embed question   ││
│                        similarity search││
│                        build prompt    ││
│                        GPT-4o-mini ◄───┘│
└──────────────────────┬──────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
┌──────────────────┐   ┌───────────────────┐
│ Supabase         │   │ OpenAI API        │
│ PostgreSQL       │   │ text-embedding-   │
│ + pgvector       │   │   3-small         │
│ documents        │   │ gpt-4o-mini       │
│ document_chunks  │   └───────────────────┘
└──────────────────┘
```

**Upload flow:** `POST /upload` → parse (PDF/CSV/image) → chunk (~500 tokens, 50-token overlap) → embed (`text-embedding-3-small`) → store in `document_chunks` → mark document `done`

**Query flow:** `POST /query` → embed question → cosine similarity search (`match_chunks`) → top-k chunks → GPT-4o-mini with grounded context → answer + sources

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS | App Router, RSC-ready, fast to iterate |
| UI components | shadcn/ui | Unstyled, accessible primitives; full control |
| File upload | react-dropzone | Drag-and-drop with click fallback, zero config |
| Data fetching | TanStack Query v5 | Auto-polling for document status, skeleton states |
| Backend | Python 3.12 + FastAPI | Fast to write, async-native, OpenAPI docs free |
| ASGI adapter | Mangum | Wraps FastAPI for AWS Lambda with zero code changes |
| Package manager | UV | 10-100× faster than pip; reproducible lockfile |
| Database | Supabase (PostgreSQL 15) | Managed Postgres with pgvector built in |
| Vector search | pgvector (`extensions.vector`) | Cosine similarity in SQL, no extra infra |
| Embeddings | OpenAI `text-embedding-3-small` | 1536 dims, cost-effective, high quality |
| Answer generation | OpenAI `gpt-4o-mini` | Fast, cheap, good at grounded Q&A |
| Tokenizer | tiktoken `cl100k_base` | Deterministic chunk sizes in tokens not chars |
| PDF parsing | pypdf | Pure-Python, no system deps |
| OCR | pytesseract | Image→text for scanned documents |
| Infra | AWS Lambda + API Gateway HTTP API | Free tier; no containers to manage |
| CI/CD | GitHub Actions | Auto-deploy backend on merge to `main` |
| Schema migrations | Supabase CLI | Version-controlled SQL, idempotent pushes |

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Python | 3.12 | [python.org](https://python.org) |
| UV | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| AWS CLI v2 | latest | [AWS install guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| Tesseract | ≥ 5 | `brew install tesseract` (macOS) / `apt install tesseract-ocr` (Linux) |

You will also need accounts at:
- [Supabase](https://supabase.com) — free tier is sufficient
- [OpenAI](https://platform.openai.com) — `text-embedding-3-small` + `gpt-4o-mini` access
- [AWS](https://aws.amazon.com) — free tier Lambda + API Gateway

---

## Setup & Run

### Backend — local dev

```bash
# 1. Clone and enter the backend
git clone https://github.com/<your-org>/teros_challenge.git
cd teros_challenge/backend

# 2. Create and activate a virtual environment with UV
uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
uv sync

# 4. Copy and fill in env vars
cp .env.example .env
# Edit .env — see Configuration Reference below

# 5. Apply database migrations to your Supabase project
supabase login              # browser OAuth — one-time
supabase link               # select your project from the list
supabase db push            # applies all pending migrations

# 6. Start the dev server
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend — Replit

The frontend lives on Replit and talks to the deployed Lambda URL. To run it locally:

```bash
cd teros_challenge/artifacts/next-app

# 1. Install dependencies
pnpm install

# 2. Set the API base URL
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000   (local backend)
# NEXT_PUBLIC_API_URL=https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com  (Lambda)

# 3. Start the dev server
pnpm dev
```

Open `http://localhost:3000`.

---

## API Reference

Base URL (production): `https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com`

---

### `GET /health`

Liveness check. Returns the running version.

```bash
curl https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/health
```

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

### `POST /upload`

Upload a document for processing. The response is immediate — processing happens synchronously before returning. Document status becomes `done` once all chunks are embedded and stored.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | PDF, CSV, PNG, JPG, or JPEG |

```bash
curl -X POST https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/upload \
  -F "file=@bank_statement.pdf"
```

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "bank_statement.pdf",
  "status": "done"
}
```

| Field | Description |
|---|---|
| `document_id` | UUID — pass this to `/query` to scope questions to a single document |
| `status` | `processing` → `done` or `error` |

---

### `GET /documents`

List all uploaded documents and their current processing status.

```bash
curl https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/documents
```

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "filename": "bank_statement.pdf",
    "status": "done",
    "uploaded_at": "2026-05-16T18:43:35.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "filename": "tax_return_2025.pdf",
    "status": "processing",
    "uploaded_at": "2026-05-16T19:01:12.000Z"
  }
]
```

Possible `status` values: `pending` · `processing` · `done` · `error`

---

### `POST /query`

Ask a natural-language question grounded in your uploaded documents. Optionally scope the search to a single document via `document_id`.

**Request** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | yes | The question in plain English |
| `document_id` | string (UUID) | no | Limit retrieval to one document; omit to search across all |

```bash
curl -X POST https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How much did I spend on groceries in March?",
    "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

```json
{
  "answer": "Based on your March statement, you spent $342.50 on groceries across 11 transactions — primarily at Whole Foods ($198.20) and Trader Joe's ($144.30).",
  "sources": [
    {
      "chunk_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "content": "03/04 WHOLE FOODS MKT  -$54.32\n03/07 TRADER JOES  -$38.90\n03/11 WHOLE FOODS MKT  -$61.14...",
      "similarity": 0.94
    },
    {
      "chunk_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "content": "03/18 WHOLE FOODS MKT  -$82.74\n03/22 TRADER JOES  -$105.40",
      "similarity": 0.91
    }
  ]
}
```

| Field | Description |
|---|---|
| `answer` | LLM-generated answer grounded in the retrieved chunks |
| `sources` | The top-k chunks used as context, with cosine similarity scores (0–1) |

---

## RAG Pipeline

```
                   ┌──────────────┐
  upload file ───► │    Parser    │  pypdf · csv stdlib · pytesseract
w                   └──────┬───────┘   (null bytes stripped for all types)
                          │
                  ┌───────┴────────┐
               CSV?              other
                  │                │
                  ▼                ▼
         ┌──────────────┐  ┌──────────────┐
         │  chunk_csv   │  │   Chunker    │  tiktoken cl100k_base
         │  row-aware   │  │  500 tokens  │  50-token overlap
         │  25 rows/    │  │  per chunk   │
         │  chunk       │  └──────┬───────┘
         └──────┬───────┘         │
                └────────┬────────┘
                         │ list[Chunk]
                         ▼
                   ┌──────────────┐
                   │   Embedder   │  text-embedding-3-small
                   │  batch=100   │  1536 dimensions
                   └──────┬───────┘
                          │ vectors
                          ▼
                   ┌──────────────────────┐
                   │ Supabase pgvector    │
                   │  document_chunks     │
                   │  IVFFlat index       │
                   └──────────────────────┘

  ask question ──► embed ──► match_chunks (cosine, top-5) ──► GPT-4o-mini ──► answer
```

### Chunking strategy

CSVs and unstructured documents (PDFs, images) use different strategies because their data shapes are fundamentally different.

**PDFs and images — token-based sliding window**
- **Tokenizer:** `cl100k_base` (same encoding used by GPT-4 / text-embedding-3-small)
- **Chunk size:** 500 tokens — large enough for a full paragraph, small enough to stay precise
- **Overlap:** 50 tokens — prevents answers from being cut at chunk boundaries

**CSVs — row-aware batching (`chunk_csv`)**
- Bypasses the token-based chunker entirely
- Uses `csv.DictReader` to detect column names automatically
- Serializes each row as `Column: value` key-value pairs so the embedding model always has column context — a chunk never contains a bare `-54.32` without knowing it's an `Amount`
- Groups **25 rows per chunk** — no row is ever split across chunk boundaries, no overlap needed since rows are independent
- Example chunk content:
  ```
  Date: 2024-03-04, Amount: -54.32, Description: WHOLE FOODS MKT, Category: Groceries
  Date: 2024-03-07, Amount: -38.90, Description: TRADER JOES, Category: Groceries
  ...
  ```

### Retrieval

The `match_chunks` SQL function computes cosine distance (`<=>`) between the query embedding and all stored chunk vectors using pgvector's IVFFlat index. The top 5 results are returned, filtered by a minimum similarity threshold of 0.5.

```sql
select chunk_id, document_id, content, 1 - (embedding <=> query_embedding) as similarity
from document_chunks
where (document_id = filter_doc_id or filter_doc_id is null)
  and 1 - (embedding <=> query_embedding) > 0.5
order by embedding <=> query_embedding
limit 5;
```

### Answer generation

Retrieved chunks are formatted into a system prompt that instructs GPT-4o-mini to answer using only the provided context, or say it doesn't know if the context is insufficient. This prevents hallucination about financial data.

---

## Database Migrations

Schema is version-controlled with the Supabase CLI. Migration files live in `backend/supabase/migrations/` and are applied in timestamp order.

```bash
# Create a new migration
supabase migration new add_tags_to_documents

# Preview what will run (no changes applied)
supabase db push --dry-run

# Apply to remote Supabase project
supabase db push
```

The CLI records applied migrations in a `supabase_migrations` table — it never double-applies.

### Migration files

| File | Purpose |
|---|---|
| `20260516184335_enable_pgvector.sql` | Enable `vector` extension in `extensions` schema |
| `20260516184336_create_documents.sql` | `documents` table with status enum check |
| `20260516184337_create_chunks_and_match_fn.sql` | `document_chunks` table + IVFFlat index + `match_chunks` similarity search function |

> **Note:** The `vector` type lives in `extensions` schema in Supabase. All references use `extensions.vector(1536)` and the `match_chunks` function sets `search_path = extensions, public` so the `<=>` operator is found.

---

## Configuration Reference

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | yes | OpenAI API key — used for embeddings and answer generation |
| `SUPABASE_URL` | yes | Project URL from Supabase → Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | yes | Publishable (anon) key — safe to use from server |
| `SUPABASE_SECRET_KEY` | yes | Secret (service_role) key — bypasses RLS; server-side only |

### Frontend — `artifacts/next-app/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the FastAPI backend (no trailing slash) |

### GitHub Actions secrets

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user key with `lambda:UpdateFunctionCode` permission |
| `AWS_SECRET_ACCESS_KEY` | Paired secret for the above |
| `OPENAI_API_KEY` | Forwarded to the Lambda environment |
| `SUPABASE_URL` | Forwarded to the Lambda environment |
| `SUPABASE_PUBLISHABLE_KEY` | Forwarded to the Lambda environment |
| `SUPABASE_SECRET_KEY` | Forwarded to the Lambda environment |

---

## Deployment

### Backend — AWS Lambda (auto-deploy)

A GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) triggers on any push to `main` that touches files under `backend/**`.

It:
1. Installs Python dependencies into a `package/` directory using `pip install --target`
2. Copies the `app/` source into `package/`
3. Zips everything and calls `aws lambda update-function-code`

Manual trigger is also available via `workflow_dispatch` in the GitHub Actions UI.

```
Lambda function:   finsight-api
Runtime:           Python 3.12
Handler:           app.main.handler   (Mangum wraps FastAPI)
API Gateway:       HTTP API — $default route → Lambda
Invoke URL:        https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com
```

### Frontend — Replit

Push to the connected GitHub repo — Replit auto-redeploys on the next page load (or manually via the Replit "Deploy" button).

---

## Project Structure

```
teros_challenge/
│
├── artifacts/
│   └── next-app/                    ← Next.js 15 frontend
│       ├── src/
│       │   ├── app/                 ← App Router pages
│       │   │   ├── page.tsx         ← Dashboard (/)
│       │   │   ├── chat/page.tsx    ← Chat view (/chat)
│       │   │   └── documents/       ← Documents page
│       │   ├── components/
│       │   │   ├── chat/            ← ChatView, ChatInput, MessageBubble, SuggestionCards
│       │   │   ├── dashboard/       ← StatsCards, DocumentsTable
│       │   │   └── ui/              ← shadcn/ui primitives
│       │   ├── hooks/
│       │   │   └── useDocuments.ts  ← React Query hook with status polling
│       │   ├── lib/
│       │   │   └── api.ts           ← Typed API client (upload, query, fetchDocuments)
│       │   └── types/
│       │       └── index.ts         ← Document, Message, Source types
│       ├── .env.local.example
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                  ← FastAPI app + Mangum handler
│   │   ├── dependencies.py          ← Cached Supabase + OpenAI clients
│   │   └── pipeline/
│   │       ├── parser.py            ← PDF, CSV, image parsing
│   │       ├── chunker.py           ← Token-based chunking (tiktoken)
│   │       ├── embedder.py          ← OpenAI embeddings + Supabase insert
│   │       └── ingest.py            ← Orchestrates parse→chunk→embed→store
│   ├── supabase/
│   │   └── migrations/              ← Timestamped SQL migration files
│   ├── Dockerfile                   ← Local dev only (not used in Lambda deploy)
│   ├── pyproject.toml               ← UV project config + dependencies
│   ├── uv.lock
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── deploy-backend.yml       ← Auto-deploy Lambda on backend changes
│
└── README.md
```

---

## Claude Code Setup

### Custom Skill — `cicd-master`

A custom Claude Code skill is configured at `.claude/skills/cicd-master/SKILL.md`. It gives Claude a specialised persona for auditing and building GitHub Actions pipelines for this repo.

**How to use:**

```
/cicd-master audit          — list all CI/CD gaps; no changes made
/cicd-master build <scope>  — create branch ci/<scope>, scaffold workflow, open PR
/cicd-master add-tests      — scaffold backend pytest + frontend type-check jobs
/cicd-master fix <workflow> — diagnose a failing workflow and open a fix PR
```

**Non-negotiable rules baked into the skill:**
- Never pushes directly to `main` — always works on a feature branch and opens a PR with `gh pr create`
- Every PR gets the `ci/cd` label and a standard body template

### Git Worktrees

The project uses git worktrees to run parallel Claude Code sessions without stashing or branch-switching.

```bash
# The worktree was created with:
git worktree add ../finsight-cicd ci/frontend-build

# Verify both worktrees:
git worktree list
# /path/to/teros_challenge    c5561e8 [replit_build]
# /path/to/finsight-cicd      2307c82 [ci/frontend-build]
```

`../finsight-cicd/` is the live worktree where the `cicd-master` skill was used to build the frontend validation CI workflow (`validate-frontend.yml`), in parallel with main-branch work. The feature was then merged back to `main` via PR.

---

## Known Issues

| Issue | Root cause | Priority |
|---|---|---|
| Inter font falls back to system font | `next/font/google` sets `--font-inter` but `globals.css` maps `--font-sans` — variable name mismatch | Low — cosmetic only |
