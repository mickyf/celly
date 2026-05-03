# Production Readiness Review

Date: 2026-05-03
Branch: `test`
Scope: Full-app review across security, reliability/UX, performance, and code health.

This is a personal/single-user app (no multi-tenancy, no sharing), so findings have been re-prioritized accordingly. Multi-tenant concerns are deprioritized; data-loss, broken core flows, and basic hardening are weighted higher.

## How to use this document

- **P0** = fix before any production deploy. Real risk of data loss, auth bypass, or core flow failure.
- **P1** = fix soon. Significant UX/reliability/security gaps; visible to users or auditors.
- **P2** = polish, optimization, future-proofing.

Each item links to a concrete file (verified) where possible. Items marked *(unverified)* came out of the review pass and need a quick check before fixing.

---

## P0 — Must fix before production deploy

### ~~P0-1. `react-hooks/set-state-in-render` lint error~~ ✅ Done
- **File:** `src/routes/cellars/index.tsx:64`
- **Why it mattered:** Calling `setState` inside `useMemo` can cause infinite render loops in React 19 — latent bug, not a style issue.
- **Fix applied:** Replaced the `useMemo`-with-side-effect with a derived value computed during render (`effectiveCellarId = selectedCellarId ?? cellars?.[0]?.id ?? null`). Local state retained for the dropdown's onChange and post-add selection.

### ~~P0-2. Bundle is a single 1.65 MB chunk (~495 KB gzipped), no code splitting~~ ✅ Done
- **File:** `vite.config.ts`
- **Why it mattered:** Cold load on mobile 3G was multi-second; PWA install size was bloated; build warned about chunk size.
- **Fix applied:** Enabled `autoCodeSplitting: true` on the TanStack Router Vite plugin (so each route component becomes its own on-demand chunk) and added `manualChunks` to split `@mantine`, `@tanstack`, `@sentry`, and `@tabler/icons-react` into cacheable vendor chunks.
- **Result:** Single 1.65 MB / 495 KB gzip chunk → split into 30+ chunks. Largest is now `mantine` at 136 KB gzip. Other routes (e.g. `wines/add`) are 4 KB gzip on-demand. Build no longer warns about chunk size.
- **Still possible:** Lazy-load `@mantine/charts` inside the dashboard component for users who don't reach the dashboard immediately. P2 follow-up if first paint becomes a hot path again.

### ~~P0-3. Zero test infrastructure~~ ✅ Scaffolded
- **Files:** `vite.config.ts`, `src/test/setup.ts`, `src/constants/countries.test.ts`, `.husky/pre-push`
- **Why it mattered:** Every refactor risked silent regressions; `useDashboard` and similar hooks had nontrivial logic with no safety net.
- **What's in place:** Vitest + happy-dom + React Testing Library + `@testing-library/jest-dom` installed. Test scripts: `npm test` (run once) and `npm run test:watch`. Husky pre-push hook runs `tsc -b && npm test` to gate every push (CF Pages auto-deploys master, so this is the safety net before code reaches production). One seed test file (`countries.test.ts`, 5 tests passing) proves the harness.
- **Lint deferred from the hook:** the codebase has 37 pre-existing lint errors (P1-15). Re-add `npm run lint` to `.husky/pre-push` once that's cleared.
- **Still to do:** real coverage on hooks (`useDashboard`, wine filter logic, enrichment merge) and components. Target ~60% coverage of `src/hooks/` and `src/lib/`.

---

## P1 — Should fix soon

### Security & hardening

### ~~P1-1. Sentry-proxy edge function has no auth~~ → downgraded to P2
- **File:** `supabase/functions/sentry-proxy/index.ts`
- **Why it was raised:** Anyone can POST envelopes and burn your Sentry quota.
- **Why downgraded:** For a personal app, the practical risk is low — the proxy already validates the project ID, Sentry has its own per-project rate limits, and the DSN is public anyway (it ships in the JS bundle). The Sentry browser SDK doesn't pass our Supabase JWT by default; wiring `transportOptions` to inject it adds real complexity for a small win. Revisit if Sentry quota becomes a cost issue.

### ~~P1-2. Storage bucket allows unrestricted SELECT on all photos~~ ✅ Done
- **Migration:** `supabase/migrations/20260503110000_make_wine_images_private.sql` flips the bucket to `public: false` and replaces the open SELECT policy with a per-user one (`auth.uid() = (storage.foldername(name))[1]`).
- **Frontend:** new `extractPhotoPath()` helper (with tests in `src/lib/winePhoto.test.ts`) and `useWinePhotoUrl()` hook (`src/hooks/useWinePhotoUrl.ts`) generate signed URLs with a 1-hour TTL and a 55-minute query staleTime, so URLs refresh ahead of expiry. The helper accepts both legacy public URLs and bare paths, so existing rows keep working.
- **Render sites updated:** `src/components/WineCard.tsx`, `src/routes/wines/$id/index.tsx`, `src/components/WineForm.tsx` (with a new `photoCleared` flag so the remove-photo button still hides the existing image when no replacement is picked).
- **Upload:** `useUploadWinePhoto` in `src/hooks/useWines.ts` now stores the storage path instead of a public URL.
- **Rollout (staged, since this project deploys against production Supabase directly):**
  1. Deploy the frontend first. `createSignedUrl` works on public buckets too, and the path extractor accepts both legacy public URLs and bare paths, so existing photos keep displaying.
  2. Verify in the live app that photos load and uploads still work.
  3. Run `npx supabase db push` to apply `20260503110000_make_wine_images_private.sql`. Bucket flips private + SELECT tightens.
  4. Re-verify photos load (now strictly via signed URLs).
- **Rollback:** flip the bucket back to `public:true` in the Supabase dashboard. Instant.

### ~~P1-3. Prompt injection surface in `claude-proxy`~~ ✅ Done
- **File:** `supabase/functions/claude-proxy/index.ts`
- **Fix applied:** Added a `sandbox()` helper that strips `</?user_input>` tags from user-provided strings and an `INJECTION_DEFENSE` instruction that tells Claude to treat anything inside `<user_input>` blocks as data only. Applied to `menu`, `wineName`, and the `wineList` (built from user-typed wine names). Image-enrichment prompt has no user-typed text data and didn't need it.
- **Not tested:** `sandbox()` lives in a Deno edge function, not directly importable from Vitest. If we add more sanitisers, extract them into a shared `_shared/` module testable from both runtimes.

### ~~P1-4. No image MIME-type / size validation on Claude vision calls~~ ✅ Done
- **File:** `supabase/functions/claude-proxy/index.ts`
- **Fix applied:** Added `validateImage()` that whitelists `image/jpeg|png|gif|webp` and rejects payloads larger than 5 MB (matching Claude vision's own limit). Removed the `as any` cast on `media_type` along the way. Returns `{ enrichmentData: null, error }` on rejection so the frontend can surface the failure.

### ~~P1-5. CORS wildcard on edge functions~~ ✅ Done
- **Files:** `supabase/functions/claude-proxy/index.ts`, `supabase/functions/sentry-proxy/index.ts`
- **Fix applied:** Both functions now build CORS headers per request, echoing the origin only if it matches the whitelist `["https://celly.pages.dev", "http://localhost:5173"]`. Added `Vary: Origin` so caches behave correctly. Error responses now also carry CORS headers (previously 401s would fail the browser CORS check).
- **Note:** Cloudflare Pages preview deployments use ephemeral subdomains (`https://*.celly.pages.dev`) and would currently be blocked. Add a regex check to `ALLOWED_ORIGINS` if you start using previews.

### ~~P1-6. Auth error messages enable account enumeration~~ ✅ Done
- **File:** `src/routes/login.tsx`, `src/locales/{en,de-CH}/auth.json`
- **Fix applied:** Replaced raw `error.message` with new generic translation keys `notifications.loginFailedMessage` ("Invalid email or password.") and `notifications.signupFailedMessage` ("Could not create the account. Please try again.") in both locales. Note: Supabase already genericises login errors at the API level — this also covers the signup leak ("User already registered"), which was the bigger enumeration vector.

### ~~P1-7. Password policy is `length >= 6` client-side only~~ ✅ Done (client side)
- **Files:** `src/lib/passwordPolicy.ts` (+ `passwordPolicy.test.ts`, 6 tests), `src/routes/login.tsx`, `src/routes/reset-password.tsx`, both `auth.json` locales.
- **Fix applied:** New `validatePasswordComplexity()` enforces min 8 chars + uppercase + digit + symbol on signup and password reset. Login form relaxed to a non-empty check (so users with older shorter passwords can still sign in). Specific error messages added in EN and de-CH.
- **Still on you:** Set the matching policy in the Supabase dashboard under Auth → Password requirements. Without that, the server still accepts weaker passwords if anyone bypasses the client.

### Reliability & UX

### ~~P1-8. Mutation submit buttons not disabled while pending~~ ✅ Already wired
- **Verification:** All four form components (`WineForm`, `WineryForm`, `TastingNoteForm`, `StockMovementForm`) accept `isLoading`, all routes pass `mutation.isPending`, and Mantine's `<Button loading>` disables clicks while spinning. The review's "unverified" flag was the alert; verification confirmed it's correct.

### ~~P1-9. Session expiry has no recovery path~~ ✅ Done
- **File:** `src/routes/__root.tsx`, `src/locales/{en,de-CH}/auth.json`
- **Fix applied:** The auth state listener in `__root.tsx` now distinguishes intentional sign-outs (a `useRef` flag set in `handleSignOut`) from token-refresh failures. On unintentional `SIGNED_OUT` while the user is on a protected route, a Mantine notification fires (`auth:notifications.sessionExpiredMessage`) and TanStack Router navigates to `/login`.

### ~~P1-10. No per-route error boundaries~~ ✅ Done
- **Files:** `src/components/RouteError.tsx` (new), `src/routes/wines/add.tsx`, `wines/$id/edit.tsx`, `wines/$id/index.tsx`, `wineries/add.tsx`, `wineries/$id/edit.tsx`
- **Fix applied:** Used TanStack Router's `errorComponent: RouteError` per route — `__root` stays mounted when a route throws. The `RouteError` component reports to Sentry, shows the error message in dev, and offers retry + go-home buttons.

### ~~P1-11. Empty states lack a CTA~~ ✅ Done
- **Files:** `src/components/EmptyState.tsx` (new), `src/routes/wines/index.tsx`, `wineries/index.tsx`; new translation keys in both locales (`emptyStateTitle`, `emptyStateAction`).
- **Fix applied:** Reusable `EmptyState` component (icon + title + message + CTA button) wired into the wines and wineries lists. Cellars already had a friendly empty state.

### ~~P1-12. Icon-only buttons missing `aria-label`~~ ✅ Done
- **Files:** `src/components/WineCard.tsx`, `WineryCard.tsx`, `WineForm.tsx`, `WineryForm.tsx`; `src/routes/__root.tsx` (burger), `src/routes/cellars/index.tsx`. New translation keys `common:buttons.merge` and `common:buttons.openMenu`.
- **Fix applied:** Added `aria-label` to every icon-only `<Button>` and `<ActionIcon>`. `LanguageSelector` was already labelled.

### Performance

### ~~P1-13. Wine photos served full-resolution (1920×1080, JPEG q=0.9) in list views~~ ✅ Done
- **Files:** `src/lib/imageResize.ts` (new), `src/hooks/useWines.ts` (upload integration). `loading="lazy"` already added to `<Image>` tags during P1-2.
- **Fix applied:** Browser-side resize at the upload boundary (max 1280 px on the longer edge, JPEG q=0.8). Skips re-encoding for files under 200 KB or when the result would be larger than the source. The full-resolution capture is still passed to the AI identification flow (better OCR), only the storage path gets the resized version.

### ~~P1-14. Dashboard runs N+1-shaped work in JS~~ ✅ Done
- **File:** `src/hooks/useDashboard.ts`
- **Fix applied:** Wines, tasting notes, and stock movements now fetch in parallel via `Promise.all` (was three sequential awaits). Replaced `Promise.all((tastingNotes||[]).map(async ...))` with a synchronous `Map` lookup for wine names. Narrowed `select('*')` on wines and stock_movements to the columns the dashboard actually uses. The Postgres-view variant is a P2 follow-up if dashboard mount is still slow on large collections.

### ~~P1-15. 25+ `any` casts and lint errors~~ ✅ Done
- **What changed:** From 36 errors + 4 warnings to 0. Replaced `useState<any>(null)` for the auth user with `useState<User | null>` across 11 routes. Typed the response shapes in `claude-proxy/index.ts` (with `Record<string, unknown>` for the enrichment accumulators and a `PairingRec` interface for recommendations). Deleted the dead `handleWineryEnrichment` function (P2-13) and its now-unused `WineryEnrichmentRequest` type. Removed unused vars (`settingsError`, `currentYear`). Tightened `Breadcrumb`/`PageHeader`/`sentry.ts` typing.
- **Suppressed with explanation:** `useUserSettings.ts` keeps a file-level eslint-disable because the table isn't in the generated database types yet — comment notes to remove the disable after `npm run gen-types`. Two stable Mantine `useForm` references (`settings.tsx`, `WineForm.tsx`) have line-level `eslint-disable-next-line react-hooks/exhaustive-deps` with a reason.
- **Hook hardened:** `.husky/pre-push` now runs `npm run lint && tsc -b && npm test`. Pushes are gated on a clean codebase.

---

## P2 — Polish & optimization

### Performance
- **P2-1.** Add DB indexes on `wines.winery_id`, `wine_locations.wine_id`, `tasting_notes.wine_id`, `stock_movements.wine_id` (`supabase/migrations/`).
- **P2-2.** Replace `select('*')` with explicit column lists in `src/hooks/useWines.ts`, `useDashboard.ts`, `useStockMovements.ts`, `useWineries.ts` — only the columns each view actually uses.
- **P2-3.** Tune TanStack Query cache: set a `gcTime` (default 5 min eviction is too eager); raise `staleTime` for dashboard/winery list (rarely changes), keep wine list low.
- **P2-4.** Stock-movement mutation invalidates the entire `['wines']` list. Use `setQueryData` for the optimistic quantity update, then invalidate `['wines', wine_id]` exact-only. (`src/hooks/useStockMovements.ts:120-123`)
- **P2-5.** PWA runtime cache name `'supabase-cache'` has no version. Bump on schema changes or include app version. (`vite.config.ts:53`)
- **P2-6.** Verify Mantine tree-shaking — confirm imports are destructured (`import { Button } from '@mantine/core'`) and that `postcss-preset-mantine` is wired up.

### UX & a11y
- **P2-7.** Add Mantine `Skeleton` for wine list / dashboard loading states (replaces `<Loader />` flashes).
- **P2-8.** Auth check returns `null` initially → blank flash. Show a minimal splash. (`src/routes/index.tsx:50-52`, `wines/index.tsx:360-365`)
- **P2-9.** Offline indicator: `navigator.onLine` + `useNetworkStatus`-style hook → banner in `__root.tsx`. Mutations while offline currently fail silently against PWA cache expectations.
- **P2-10.** Standardize notification autoClose timing (success and error) and ensure errors include a close button.
- **P2-11.** Run grape theme through axe/WAVE for WCAG AA contrast on `grape.4` text and similar light shades. (`src/main.tsx:18-32`)

### Code health
- **P2-12.** Remove 18 stray `console.log/error` calls (route through Sentry instead). Worst: `src/lib/claude.ts`, `src/routes/cellars/index.tsx:48`, `src/components/WineryForm.tsx:72`.
- **P2-13.** Dead code: `handleWineryEnrichment` in `supabase/functions/claude-proxy/index.ts:545` is never called; unused `settingsError` (line 75), `currentYear` (line 148).
- **P2-14.** Form boilerplate is duplicated across `WineForm`, `WineryForm`, `TastingNoteForm`, `StockMovementForm`. Consider a small `useFormSubmit({ mutation, onSuccessNav })` helper — *only if* you'll add a 5th form, otherwise leave it.
- **P2-15.** Centralize mutation error handling: one helper that sends to Sentry + shows a notification, replacing the scattered `onError` closures.
- **P2-16.** `npm audit --production`: 4 HIGH, 1 MODERATE — all in dev/transitive deps (minimatch/picomatch ReDoS, seroval). Run `npm audit fix`; nothing exploitable in shipped code.
- **P2-17.** Bring TanStack libs current — they're 10–25 minor versions behind. Patch React 19.2.3 → 19.2.5. Skip TS 5→6 and react-i18next 16→17 majors for now.
- **P2-18.** Add CSP / security headers via Cloudflare Pages `_headers`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`.

### MCP server
- **P2-19.** `USER_AUTH_TOKEN` in `mcp-server/src/config.ts` is a long-lived plaintext env var with no refresh. Acceptable for personal use; flag it in the README so it doesn't get checked in.

---

## Suggested order of execution

1. **One PR for P0**: cellars `setState`-in-`useMemo` fix, code splitting via `manualChunks` + lazy routes, Vitest scaffolding with 2–3 starter tests. Establishes the baseline.
2. **One PR for security P1s** (1–7): tighten edge functions, storage policy, login error message, password policy. Small surface area, easy to review.
3. **One PR for reliability P1s** (8–12): mutation buttons, session expiry handler, error boundaries, empty states, aria-labels.
4. **One PR for performance P1s** (13–15): image resizing, dashboard query refactor, lint/`any` cleanup. Bigger; do this with the tests from step 1 in place.
5. **P2 items**: triage in batches as they touch the same files.

Total estimate: ~5–7 days of focused work to clear P0+P1.

---

## Appendix: what's already solid

Don't rebuild these — they're fine:

- **RLS coverage** is complete across all seven tables (`wineries`, `wines`, `tasting_notes`, `stock_movements`, `cellars`, `wine_locations`, `user_settings`). Every CRUD op is `auth.uid() = user_id`.
- **TanStack Query patterns** — mutation invalidation is consistent and correct.
- **i18n setup** — namespaces are sensibly split, EN/de-CH key counts match.
- **Sentry integration** — proxy tunnel, source maps, browser tracing, replay are all wired up.
- **Edge function architecture** — Claude API key is server-side only, frontend never sees it.
- **TypeScript strict mode** is on (the `any` count is a usage problem, not a config one).
- **README** is thorough and accurate.
