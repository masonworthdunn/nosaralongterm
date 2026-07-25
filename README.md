# Nosara Long Term Rentals

A free, no-login community rental-listings board for Nosara, Costa Rica — [nosaralongterm.com](https://nosaralongterm.com). Built to replace disorganized WhatsApp/Facebook rental groups with something searchable. Run by one person as an unpaid community service, not a business.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + TypeScript
- [Supabase](https://supabase.com) — Postgres, Row Level Security, Storage (no Supabase Auth — see below)
- Tailwind CSS v4
- Deployed on [Vercel](https://vercel.com), auto-deploys on push

## No accounts, anywhere

There are no logins. Two different things are handled without them:

- **Favorites, theme, language** — stored in `localStorage`, per-browser.
- **Owning a listing** (editing, deleting, renewing) — a random unguessable link (`?token=...`) known only to whoever posted the listing. Losing the link means losing easy access to the listing; the admin can look up a fresh link if needed.

See `CLAUDE.md` for the full architecture writeup — data model, RLS/security model, i18n system, hydration-safety patterns, and known limitations. It's kept up to date and is the source of truth for anything non-obvious in this codebase.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need a `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=...
```

(`.env.local.example` shows the shape; ask the project owner for real values — the service role key and admin password are secrets and must never be committed or exposed to the client.)

## Database changes

SQL migrations are **not automated**. `supabase/schema.sql` is the running history of every schema change — new migrations get appended to the bottom of that file, then pasted by hand into the Supabase SQL Editor and run. Nothing in the app verifies the deployed schema matches the code, so any schema change must be applied manually before (or immediately after) deploying code that depends on it.

## Deploying

```bash
npm run build   # must pass before pushing
git push         # Vercel auto-deploys the connected branch
```

There's no test suite or CI — verification is `npm run build` plus a manual check in the browser.

## Admin

`/admin` is a password-gated page (single shared password via `ADMIN_PASSWORD`, not per-user accounts) for reviewing flagged listings, recovering lost manage links, and deleting listings.
