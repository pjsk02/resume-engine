# resume-engine

A browser-only AI toolkit for job seekers. No backend required — all state lives in `localStorage`/`sessionStorage`, and LLM calls go directly from the browser to the Anthropic API.

## Features

| Tab | What it does |
|-----|-------------|
| **Optimizer** | Paste a job description + your resume → get an ATS-tuned rewrite, an ATS compatibility score with matched/missing keywords, and the 10 most impactful action verbs from the JD. Download the result as DOCX or PDF. |
| **Outreach** | Generate cold-outreach emails (with editable subject + body) or LinkedIn connection request messages from a PDF profile. Saved contacts go straight into the Tracker. |
| **Tracker** | Manage your outreach pipeline. Expand any contact card to view the original message, edit notes (auto-saved), update status, and generate AI follow-up messages that thread into the contact's conversation history. |

## Running locally

```bash
# 1. Clone and install
git clone https://github.com/pjsk02/resume-engine.git
cd resume-engine
npm install

# 2. Add your Anthropic API key (or paste it into the in-app modal)
cp .env.example .env
# Edit .env and set VITE_ANTHROPIC_KEY=sk-ant-...

# 3. Start the dev server
npm run dev
# opens at http://localhost:5173
```

If `VITE_ANTHROPIC_KEY` is not set, the app shows a modal on first load asking for the key. It is stored in `sessionStorage` only and is cleared when the tab closes. You can update it any time via the settings panel (gear icon, top-right).

To build for production:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally
```

## Swapping to a backend

The app currently calls the Anthropic API directly from the browser, which exposes your API key in the browser's network tab. For any non-personal deployment, proxy all LLM calls through a thin server-side function — a Next.js API route, Cloudflare Worker, or Express endpoint all work. Replace the `fetch("https://api.anthropic.com/v1/messages", ...)` calls inside `src/services/llm.ts` with calls to your own endpoint; the rest of the app is unchanged. Your server receives the prompt, attaches the key from a server-side environment variable, calls Anthropic, and returns the response. This also gives you a natural place to add rate limiting, caching, and usage logging without touching any component code.

## Migrating to Supabase

All contact persistence is isolated in `src/services/storage.ts`. Every function that reads from or writes to `localStorage` is annotated with:

```
// SUPABASE MIGRATION: replace these calls with Supabase client equivalents
```

To migrate: search the codebase for `SUPABASE MIGRATION`, replace each `localStorage` operation with the corresponding Supabase call (`supabase.from('contacts').select()`, `.insert()`, `.update()`, `.delete()`), add `supabase.auth` at the app root, and update the `Contact` interface to match your table schema. The component layer — `Tracker.tsx`, `ConnectionRequest.tsx` — imports only from `storage.ts` and needs no changes.
