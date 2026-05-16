# Next.js App

A Next.js + TypeScript + Tailwind CSS starter project.

## Run & Operate

- `pnpm --filter @workspace/next-app run dev` — run the Next.js dev server (port 3000)
- `pnpm --filter @workspace/next-app run build` — build for production
- `pnpm --filter @workspace/next-app run typecheck` — typecheck the Next.js app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Framework: Next.js 15 (App Router)
- Styling: Tailwind CSS v4
- Build: Next.js built-in (esbuild + SWC)

## Where things live

- `artifacts/next-app/` — Next.js application
- `artifacts/next-app/src/app/` — App Router pages and layouts
- `artifacts/next-app/src/app/globals.css` — global styles (Tailwind v4 import)
- `artifacts/next-app/next.config.ts` — Next.js configuration
- `artifacts/next-app/postcss.config.mjs` — PostCSS config (Tailwind v4 via `@tailwindcss/postcss`)

## Architecture decisions

- Uses Tailwind CSS v4 (`@import "tailwindcss"` in CSS, no config file needed)
- App Router (`src/app/`) is the default routing model
- `@/*` path alias maps to `src/*`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Tailwind v4 uses `@import "tailwindcss"` in CSS — no `tailwind.config.ts` needed
- Dev server binds to `0.0.0.0` so it's reachable through the Replit proxy

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
