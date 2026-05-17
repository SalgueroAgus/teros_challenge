# FinSight — AI-Powered Personal Finance Assistant

## Table of Contents

1. [Goal](#goal)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Setup & Run](#setup--run)
   - [Backend — local dev](#backend--local-dev)
   - [Frontend — Replit](#frontend--replit)
6. [Security](#security)
   - [Generating an API key](#generating-an-api-key)
   - [Configuring CORS](#configuring-cors)
7. [API Reference](#api-reference)
8. [RAG Pipeline](#rag-pipeline)
9. [Database Migrations](#database-migrations)
10. [Configuration Reference](#configuration-reference)
11. [Deployment](#deployment)
12. [Claude Code Setup](#claude-code-setup)
13. [Project Structure](#project-structure)

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
│  Rate-limited: 25 questions/session     │
└──────────┬───────────────┬──────────────┘
           │               │
     upload file      ask question
     X-API-Key        X-API-Key
           │               │
           ▼               ▼
┌─────────────────────────────────────────┐
│   FastAPI — AWS Lambda + API Gateway    │
│   CORS locked to Replit origin          │
│   API key auth on all routes            │
│                                         │
│  POST /upload    ──►  parse             │
│                        chunk            │
│                        embed            │
│                        store ──────────┐│
│                                        ││
│  GET  /documents                       ││
│  DELETE /documents/{id}                ││
│                                        ││
│  POST /query     ──►  expand query     ││
│                        embed           ││
│                        hybrid search   ││
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
│ document_chunks  │   │ (chat + vision)   │
└──────────────────┘   └───────────────────┘
```

**Upload flow:** `POST /upload` → validate (size ≤ 10 MB, no duplicate filename) → parse (PDF/CSV/image) → chunk → embed (`text-embedding-3-small`) → store in `document_chunks` → mark document `done`

**Query flow:** `POST /query` → expand question → embed → hybrid dense+sparse search → top-5 chunks by RRF score → GPT-4o-mini → answer + sources

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
| OCR | OpenAI `gpt-4o-mini` vision | Image→text via API — no system binary required |
| Tokenizer | tiktoken `cl100k_base` | Deterministic chunk sizes in tokens not chars |
| PDF parsing | pypdf | Pure-Python, no system deps |
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

> When `API_KEY` is not set in `.env`, the key check is disabled — all requests are accepted. This is intentional for local development.

### Frontend — Replit

The frontend lives on Replit and talks to the deployed Lambda URL. To run it locally:

```bash
cd teros_challenge/artifacts/next-app

# 1. Install dependencies
pnpm install

# 2. Configure env vars
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000        (local backend)
#   NEXT_PUBLIC_API_URL=https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com  (Lambda)
#   NEXT_PUBLIC_API_KEY=<your-api-key>               (must match API_KEY in Lambda env)

# 3. Start the dev server (clear cache if switching backends)
rm -rf .next
pnpm dev
```

Open `http://localhost:3000`.

---

## Security

### Generating an API key

All API routes (except `/health`) require an `X-API-Key` header. Generate a strong random key with one of these commands:

```bash
# macOS / Linux (openssl — recommended)
openssl rand -hex 32

# Python (cross-platform)
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Example output: `a3f8c2e1d4b7960f5e2a1c8d3b6e9f4a2c5d8e1f4b7a0c3d6e9f2a5b8c1d4e7`

Set the same value in two places:
1. **Lambda environment variable** `API_KEY=<value>` (via AWS Console or CLI)
2. **Replit secret** `NEXT_PUBLIC_API_KEY=<value>`

> **Note:** `NEXT_PUBLIC_*` variables are visible in the browser bundle. This key prevents casual abuse from unauthenticated curl requests. For production systems handling sensitive data, route API calls through a Next.js server-side API route so the key never reaches the client.

### Configuring CORS

The backend allows all origins (`*`) at the FastAPI level. Origin-level restriction is intentionally omitted because the `X-API-Key` header already prevents unauthorized access — CORS origin headers are trivially spoofable outside a browser and add no meaningful security on top of a key check.

API Gateway is configured with `AllowOrigins: ["*"]` to ensure preflight OPTIONS requests are handled correctly before reaching Lambda.

---

## API Reference

Base URL (production): `https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com`

All routes except `/health` require the header:
```
X-API-Key: <your-api-key>
```

---

### `GET /health`

Liveness check. No authentication required.

```bash
curl https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/health
```

```json
{ "status": "ok", "version": "0.1.0" }
```

---

### `POST /upload`

Upload a document for processing. Returns immediately once all chunks are embedded and stored (synchronous).

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | PDF, CSV, PNG, JPG, or JPEG — max 10 MB |

**Error responses**

| Status | Condition |
|---|---|
| `400` | Unsupported file type |
| `409` | A document with the same filename already exists |
| `413` | File exceeds 10 MB |

```bash
curl -X POST https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/upload \
  -H "X-API-Key: <your-api-key>" \
  -F "file=@bank_statement.pdf"
```

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "bank_statement.pdf",
  "status": "done"
}
```

---

### `GET /documents`

List all uploaded documents ordered by upload date (newest first).

```bash
curl https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/documents \
  -H "X-API-Key: <your-api-key>"
```

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "filename": "bank_statement.pdf",
    "status": "done",
    "uploaded_at": "2026-05-16T18:43:35.000Z"
  }
]
```

Possible `status` values: `pending` · `processing` · `done` · `error`

---

### `DELETE /documents/{document_id}`

Delete a document and all its chunks. Returns 404 if the document does not exist.

```bash
curl -X DELETE https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "X-API-Key: <your-api-key>"
```

```json
{ "deleted": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

---

### `POST /query`

Ask a natural-language question grounded in your uploaded documents. Optionally scope the search to a single document.

**Request** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string (max 500 chars) | yes | The question in plain English |
| `document_id` | string (UUID) | no | Limit retrieval to one document; omit to search across all |

**Error responses**

| Status | Condition |
|---|---|
| `404` | No matching chunks found — upload a document first |
| `422` | `question` is empty or exceeds 500 characters |

```bash
curl -X POST https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
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
      "content": "Date: 2024-03-04, Description: WHOLE FOODS MKT, Amount: -54.32, Category: Groceries",
      "similarity": 0.94
    }
  ]
}
```

| Field | Description |
|---|---|
| `answer` | LLM-generated answer grounded in the retrieved chunks |
| `sources` | Top-k chunks used as context, with cosine similarity scores (0–1) |

---

## RAG Pipeline

```
                   ┌──────────────┐
  upload file ───► │    Parser    │  pypdf · GPT-4o-mini vision · csv stdlib
                   └──────┬───────┘   (null bytes stripped for all types)
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

  ask question
       │
       ▼
  query expansion (GPT-4o-mini) — rewrites to finance document vocabulary
       │
       ├──── dense:  embed → cosine similarity (pgvector)
       │
       └──── sparse: plainto_tsquery → ts_rank_cd (PostgreSQL FTS)
                │
                └── RRF merge → top-5 chunks → GPT-4o-mini → answer
```

### Chunking strategy

CSVs and unstructured documents use different strategies because their data shapes are fundamentally different.

**PDFs and images — token-based sliding window**
- **Tokenizer:** `cl100k_base` (same encoding used by GPT-4 / text-embedding-3-small)
- **Chunk size:** 500 tokens — large enough for a full paragraph, small enough to stay precise
- **Overlap:** 50 tokens — prevents answers from being cut at chunk boundaries

**CSVs — row-aware batching (`chunk_csv`)**
- Bypasses the token-based chunker entirely
- Uses `csv.DictReader` to detect column names automatically
- Serializes each row as `Column: value` pairs so the embedding model always has column context — a chunk never contains a bare `-54.32` without knowing it's an `Amount`
- Groups **25 rows per chunk** — no row ever splits across chunk boundaries
- Example chunk content:
  ```
  Date: 2024-03-04, Amount: -54.32, Description: WHOLE FOODS MKT, Category: Groceries
  Date: 2024-03-07, Amount: -38.90, Description: TRADER JOES, Category: Groceries
  ```

### Query expansion

Before embedding, the user's question is rewritten by GPT-4o-mini into finance document vocabulary — keywords and synonyms likely to appear in receipts, statements, and invoices. This bridges the gap between how users speak ("biggest expense") and how documents read ("RENT PAYMENT -2100.00").

```
"What's the most expensive item?"
        ↓  GPT-4o-mini (temp=0, max_tokens=60)
"highest price item cost expensive purchase total amount"
        ↓  embedded + searched
```

### Retrieval — hybrid search with RRF

`match_chunks` combines two retrieval signals and merges them with **Reciprocal Rank Fusion**:

| Signal | Method | Good at |
|---|---|---|
| **Dense** | Cosine similarity via pgvector IVFFlat | Semantic meaning, paraphrases |
| **Sparse** | PostgreSQL `ts_rank_cd` full-text search | Exact terms, numbers, proper nouns |

```
rrf_score = 1/(60 + dense_rank) + 1/(60 + sparse_rank)
```

The `60` constant is standard from the original RRF paper — it down-weights low-ranked results without requiring manual weight tuning. Top-5 chunks by RRF score are returned.

**Threshold scoping:** when the query is scoped to a specific document (`document_id` provided), the similarity threshold is relaxed from `0.3` to `0.1` — cross-document noise isn't a risk when scope is already fixed.

### Answer generation

Retrieved chunks are passed to GPT-4o-mini with a system prompt that instructs it to answer using only the provided context, or say it doesn't know if the context is insufficient. This prevents hallucination about financial data.

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
| `20260516184337_create_chunks_and_match_fn.sql` | `document_chunks` table + IVFFlat index + original `match_chunks` function |
| `20260517005821_hybrid_match_chunks.sql` | Replace `match_chunks` with hybrid dense + sparse RRF version; adds `query_text` parameter |

> **Note:** The `vector` type lives in the `extensions` schema in Supabase. All references use `extensions.vector(1536)` and the `match_chunks` function sets `search_path = extensions, public` so the `<=>` operator is resolved correctly.

---

## Configuration Reference

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | yes | OpenAI API key — used for embeddings, answer generation, and vision OCR |
| `SUPABASE_URL` | yes | Project URL from Supabase → Settings → API |
| `SUPABASE_SECRET_KEY` | yes | Service role key — bypasses RLS; server-side only |
| `API_KEY` | no | Random secret sent by the frontend as `X-API-Key`; if unset, auth is disabled (local dev only) |

### Frontend — `artifacts/next-app/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the FastAPI backend (no trailing slash) |
| `NEXT_PUBLIC_API_KEY` | no | Must match `API_KEY` set in the Lambda environment; if unset, the header is omitted |

### GitHub Actions secrets

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user key with `lambda:UpdateFunctionCode` permission |
| `AWS_SECRET_ACCESS_KEY` | Paired secret for the above |
| `AWS_REGION` | Lambda region (e.g. `us-east-1`) |
| `OPENAI_API_KEY` | Forwarded to the Lambda environment |
| `SUPABASE_URL` | Forwarded to the Lambda environment |
| `SUPABASE_SECRET_KEY` | Forwarded to the Lambda environment |

---

## Deployment

### Backend — AWS Lambda (auto-deploy)

A GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) triggers on any push to `main` that touches files under `backend/**`.

It:
1. Runs the full test suite (`pytest`) — deploy aborts if any test fails
2. Installs Python dependencies into a `package/` directory using `pip install --target`
3. Copies the `app/` source into `package/`
4. Zips everything and calls `aws lambda update-function-code`

Manual trigger is also available via `workflow_dispatch` in the GitHub Actions UI.

```
Lambda function:   finsight-api
Runtime:           Python 3.12
Handler:           app.main.handler   (Mangum wraps FastAPI)
API Gateway:       HTTP API — $default route → Lambda
Invoke URL:        https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com
```

**Post-deploy checklist (one-time setup in AWS Console → Lambda → Configuration → Environment variables):**

```
OPENAI_API_KEY      = <from OpenAI>
SUPABASE_URL        = <from Supabase>
SUPABASE_SECRET_KEY = <from Supabase>
API_KEY             = <generated with openssl rand -hex 32>
```

### Frontend — Replit

Set the following in Replit → Secrets:

```
NEXT_PUBLIC_API_URL = https://tzywgdhhkg.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_API_KEY = <same value as API_KEY in Lambda>
```

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
│       │   │   ├── dashboard/       ← SummaryCard, DocumentsTable (with delete)
│       │   │   └── ui/              ← shadcn/ui primitives
│       │   ├── hooks/
│       │   │   └── useDocuments.ts  ← useDocuments (polling) + useDeleteDocument (mutation)
│       │   ├── lib/
│       │   │   ├── api.ts           ← Typed API client (upload, query, fetchDocuments, deleteDocument)
│       │   │   └── chat-context.tsx ← Chat session context (messages, history, doc pin) — persists across tab navigation
│       │   └── types/
│       │       └── index.ts         ← Document, Message, Source types
│       ├── .env.local.example
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                  ← FastAPI app, CORS, API key auth, all routes
│   │   ├── dependencies.py          ← Supabase + OpenAI clients + verify_api_key dependency
│   │   └── pipeline/
│   │       ├── parser.py            ← PDF (pypdf), CSV, image (GPT-4o-mini vision)
│   │       ├── chunker.py           ← Token-based (tiktoken) + CSV row-aware chunking
│   │       ├── embedder.py          ← OpenAI embeddings + Supabase insert
│   │       └── ingest.py            ← Orchestrates parse → chunk → embed → store
│   ├── tests/
│   │   ├── conftest.py              ← Shared fixtures (mock Supabase + OpenAI)
│   │   ├── test_api.py              ← API endpoint tests (37 tests)
│   │   ├── test_chunker.py          ← Chunker unit tests
│   │   └── test_parser.py           ← Parser unit tests
│   ├── supabase/
│   │   └── migrations/              ← Timestamped SQL migration files
│   ├── pyproject.toml               ← UV project config + dependencies
│   ├── uv.lock
│   └── .env.example
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml       ← Tests + Lambda deploy on push to main
│       ├── pr-checks.yml            ← Backend tests on every PR
│       └── validate-frontend.yml    ← TypeScript check on frontend changes
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
- Never pushes directly to `main` — always works on a feature branch and opens a PR
- Every PR gets the `ci/cd` label and a standard body template

---

## Known Issues

| Issue | Root cause | Priority |
|---|---|---|
| Inter font falls back to system font | `next/font/google` sets `--font-inter` but `globals.css` maps `--font-sans` — variable name mismatch | Low — cosmetic only |
