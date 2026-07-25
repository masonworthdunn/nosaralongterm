@AGENTS.md

# Nosara Long Term Rentals

Community rental-listings site for Nosara, Costa Rica (nosaralongterm.com). Built and run by one person as an unpaid community service — no monetization, no ops budget, so every design choice below favors "zero maintenance" over "more features."

## Stack

- Next.js 16 App Router + Turbopack, all pages client components (`"use client"`) except the root layout
- Supabase: Postgres + Row Level Security + Storage, no Supabase Auth
- Tailwind CSS v4 (`@import "tailwindcss"` in `globals.css`, class-based dark mode via `@custom-variant dark`)
- Deployed on Vercel, auto-deploys on push to the GitHub-connected branch
- No test suite, no CI. Verification is `npm run build` + manual check in a browser.

## Architecture: no accounts

There are no user accounts anywhere in this app. Two different problems are solved without them:

**"Who am I" (favorites, theme, language)** — pure `localStorage`, per-browser, never synced anywhere. See `components/FavoritesProvider.tsx`, `components/LanguageProvider.tsx`, `components/ThemeToggle.tsx`. All reads/writes are wrapped in try/catch (Safari private mode and similar throw on `localStorage` access).

**"Do I own this listing" (edit/delete/renew)** — an unguessable UUID token, not a login. `supabase/schema.sql`'s `listing_edit_tokens` table holds `listing_id -> token` with **no anon SELECT policy at all** — it cannot be read directly through the Supabase client no matter what query is written, only through the SECURITY DEFINER functions below. The token is appended to the listing URL as `?token=...` and is the only way to reach the edit/delete/renew UI. Losing the link means losing the listing (mitigated by copy-to-clipboard + the WhatsApp self-send button on the submit success screen).

## Data model

Single main table, `listings` (see `supabase/schema.sql` for the authoritative definition — read that file before changing anything schema-related, this section is a summary and will drift):

- Auto-approved on submit (`status` defaults to `'approved'` — there is no moderation queue, see below)
- `expires_at` defaults to `now() + 30 days`; expired or non-approved rows are invisible to anon SELECT (enforced by RLS, not app code)
- `flagged` boolean for community-driven moderation (see below)
- `amenities` / `utilities_included` are `text[]` matched against the `AMENITIES`/`UTILITIES` constants in `lib/supabase.ts` — the checkbox options shown in the UI. Changing those constants does not change any existing row's data, only what new submissions can select and what labels `lib/i18n.ts`'s `AMENITY_LABELS`/`UTILITY_LABELS` can render (unrecognized keys stored in old rows just won't render a label).

`listing_edit_tokens` is the second table (see above).

## Photos

`photo_urls` are public Supabase Storage URLs. Every place that renders an *already-uploaded* photo at a fixed thumbnail size (`ListingCard`, the listing detail page's thumbnail strip, `app/admin/page.tsx`, and the edit page's `existingPhotos` preview) uses `next/image`, not a plain `<img>` — this resizes/caches through Next's image optimizer instead of re-serving full-size originals on every pageview, which is the main lever against Supabase's Cached Egress quota (a photo-heavy site can blow through the Free tier's 5GB/mo cached-egress limit in days otherwise, even with tiny total Storage usage, since it's driven by repeated views, not stored bytes). `next.config.ts`'s `images.remotePatterns` allowlists the project's storage hostname — update it if the Supabase project ever changes.

Two exceptions stay as plain `<img>`, deliberately: the submit/edit forms' *unsaved* photo previews (`URL.createObjectURL()` blob URLs — Next's optimizer can't fetch a `blob:` URL, it only exists in that browser tab), and the full-screen lightbox image on the listing detail page (an intentional "view full photo" zoom, low-frequency compared to thumbnails shown on every listing everywhere).

## Security model — read this before touching RLS or the SQL functions

Anon (public, unauthenticated) clients can:
- INSERT a listing (auto-approved, via a plain RLS policy)
- SELECT listings that are `approved` and not expired (plain RLS policy)
- Upload to the `listing-photos` storage bucket (plain RLS policy; server-side enforces JPEG/PNG/WEBP/GIF up to 8MB — see the bucket update at the bottom of `schema.sql`, must be run manually, see Deployment)
- Call `flag_listing(listing_id)` — a SECURITY DEFINER function that can only ever set `flagged = true`. This is intentionally not a general UPDATE policy so a compromised or malicious client can never touch price/contact/status/etc.
- Call `create_listing_edit_token`, `delete_own_listing`, `update_own_listing`, `renew_own_listing` — all SECURITY DEFINER, all gated by checking the caller's token against `listing_edit_tokens` inside the function body, none reachable any other way

**The pattern to follow for any new "let the public do X, but only in this narrow way" feature: write a SECURITY DEFINER SQL function that does exactly that one thing, grant EXECUTE to anon, and do not add a general-purpose RLS policy.** This is the load-bearing security idea of the whole app.

Admin routes (`app/api/admin/**`, backing `app/admin/page.tsx`) use `lib/supabaseAdmin.ts`'s `supabaseAdmin` client (service role key, bypasses RLS entirely) and gate every request on `isAdminAuthorized()`, which compares an `x-admin-password` header against the `ADMIN_PASSWORD` env var. This is a single shared password, not per-user auth, and the comparison is a plain `===` (not timing-safe) — acceptable for this project's threat model (a volunteer community board, not a target worth a timing attack), but worth knowing if the threat model ever changes.

**Moderation model**: there is no pre-publish review. Submissions go live immediately (see `status` default above). The only moderation is post-hoc: anyone can flag a listing as suspicious, and the admin reviews flagged listings and deletes if needed. This was a deliberate tradeoff (see Known Limitations) — it means bad listings are visible until someone flags them and the admin acts.

## i18n

Client-side only, no routing-based i18n (no `/en/`, `/es/` paths). `components/LanguageProvider.tsx` holds the current `Language` (`"en" | "es"`) in React state, initialized to `"en"` and updated from `localStorage` post-mount (this two-step init is intentional — see Hydration below). `lib/i18n.ts` holds the `translations` dictionary plus label maps for amenities/utilities/lease terms/bedrooms/areas. To add a new UI string: add the key to both `en` and `es` in `translations`, then call `t("yourKey")` — TypeScript will error anywhere the key is unused or misspelled since `TranslationKey = keyof typeof translations["en"]`.

## Hydration safety

Several pieces of client state must render identically on the server and on first client paint, then update after mount — otherwise React throws a hydration mismatch:
- Theme: an inline `<script>` in `app/layout.tsx`'s `<head>` sets the `dark` class on `<html>` before React hydrates (reading `localStorage`, falling back to `prefers-color-scheme`), paired with `suppressHydrationWarning` on `<html>`. `ThemeToggle` itself starts at `isDark = false` and corrects itself in a `useEffect`.
- Language: starts at `"en"`, corrected from `localStorage` in a `useEffect`.
- Favorites: starts as an empty `Set`, corrected from `localStorage` in a `useEffect`. The favorites page additionally uses a `hydrated` boolean flag before rendering "no favorites yet" vs. the list, to avoid a flash of the empty state.

If you add new client-only state that affects render output, follow this same pattern (SSR-safe default, then `useEffect` to correct it) rather than reading `localStorage`/`window` during render.

## Deployment

```bash
npm run build   # must pass before pushing
git push        # Vercel auto-deploys the connected branch
```

Env vars (set via `vercel env add`, not committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe, RLS-bound), `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS — never expose to the client, never prefix with `NEXT_PUBLIC_`), `ADMIN_PASSWORD`.

**SQL migrations are not automated.** `supabase/schema.sql` is the running history of every change — new migrations get appended to the bottom of that file, then the new statements (not the whole file) get pasted into the Supabase SQL Editor by hand and run. If you write a migration, tell the user exactly what to paste and confirm they've run it before considering the change done — nothing in the app verifies the DB schema matches the code.

## Known limitations (accepted tradeoffs, not bugs)

- **No accounts means no recovery.** If a submitter loses their manage link, the admin can look up a fresh one via `app/admin/page.tsx`'s "Copy manage link" (backed by `create_listing_edit_token`, which is idempotent — reuses the existing token). Otherwise the listing is unreachable until it expires.
- **Expired listings are a dead end.** RLS blocks anon SELECT on any listing once `expires_at` passes, including for the owner with a valid token — so the edit/renew page can't even load the listing to offer a renew button once it's expired. The renewal nudge banner (`app/listings/[id]/page.tsx`, `showRenewalNudge`) exists specifically to get ahead of this by prompting renewal starting 5 days before expiry. There is no post-expiry recovery path short of the owner resubmitting fresh.
- **No spam/rate limiting.** Anyone can submit unlimited listings from the same WhatsApp number or IP — this was a deliberate choice (asked and confirmed mid-project) since the target audience is small and self-policing via the flag system is considered sufficient for now.
- **No push notifications.** Renewal reminders are passive (an on-page banner), not proactive (no email/SMS/WhatsApp Business API), because that infra costs money and this project has none.
- **Per-browser state.** Favorites/theme/language don't follow a user across devices or browsers — there's no account to attach them to.
- **User-generated content isn't translated.** The language toggle translates UI chrome only; listing titles/descriptions appear in whatever language the submitter wrote them.
- **Admin page is English-only** and has no password recovery — if `ADMIN_PASSWORD` is lost, it must be reset via `vercel env`.
- **Storage bucket limits require a manual SQL step** (see bottom of `supabase/schema.sql`) — if that statement was never run in the Supabase SQL Editor, photo size/type is only enforced client-side and can be bypassed by a modified client.
