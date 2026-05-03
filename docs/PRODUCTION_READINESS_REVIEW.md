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
- ✅ **P2-1.** `wines.winery_id` index added (`supabase/migrations/20260503160000_add_wines_winery_id_index.sql`). The other FK columns flagged in the original review were already indexed.
- ✅ **P2-2.** `select('*')` narrowed to explicit column lists in `useWineries`, `useTastingNotes`, `useStockMovements`, `useCellars` (list queries only — singletons keep `*`). `useWines` list left as-is: 12 of 14 columns are used by the card so the savings are marginal.
- ✅ **P2-3.** Global `gcTime: 30 min` set in `src/App.tsx`. Per-hook staleTime not tuned — explicit invalidation already handles the freshness side.
- ✅ **P2-4.** `useAddStockMovement` does an `onMutate` optimistic delta on the wines list with `previousWines` rollback in `onError`. `onSuccess` invalidates only `['wines', wine_id]`, not the whole list. (`src/hooks/useStockMovements.ts`)
- ✅ **P2-5.** Cache renamed `supabase-cache` → `supabase-cache-v2` in `vite.config.ts`.
- ✅ **P2-6.** Verified — `postcss-preset-mantine` is wired in `postcss.config.cjs`, all imports are destructured (no `import *`), and the `mantine` manual chunk lands at ~136 KB gzip.

### UX & a11y
- ✅ **P2-7.** `src/components/skeletons.tsx` — `WineCardSkeleton`, `WineGridSkeleton`, `StatCardSkeleton`, `DashboardStatsSkeleton`. Used in dashboard and wines list during initial load.
- ✅ **P2-8.** `src/components/AuthSplash.tsx` replaces `return null` in 7 routes' auth-check branches with a centered loader.
- ✅ **P2-9.** `useOnlineStatus` hook + `OfflineBanner` mounted in `__root.tsx`. EN/de-CH locale strings under `common:offline.{title,message}`.
- ✅ **P2-10.** Global `autoClose={5000}` on `<Notifications />`. `showMutationError` overrides to `8000` + `withCloseButton: true` so error toasts have time to be read.
- 🖱️ **P2-11.** *Manual browser task.* Run the live app through axe DevTools or WAVE for WCAG AA contrast on `grape.4` and `c="dimmed"` text. Adjust the palette where flagged. ~10 minutes with a Chrome extension; can't be done from CLI.

### Code health
- ✅ **P2-12.** All 15 stray `console.error` calls removed. Route-level catches now empty (`// handled in mutation onError`); `CameraCapture` and `useWineEnrichment` swallowed paths now `Sentry.captureException`. `console.log` survives only in dev-gated paths (`main.tsx` PWA banner, `lib/sentry.ts`).
- ✅ **P2-13.** `handleWineryEnrichment` and the `WineryEnrichmentRequest` type deleted; unused `settingsError` and `currentYear` removed (during P1-15 lint sweep).
- ⏭️ **P2-14.** Form boilerplate dedup deferred — only worthwhile if a fifth form arrives.
- ✅ **P2-15.** `src/lib/mutationError.ts` exports `showMutationError(t, error)` that captures to Sentry and shows a red toast. Wired into 19 onError sites across hooks. Stock movement keeps its bespoke onError to retain the optimistic rollback.
- ✅ **P2-16.** `npm audit fix` ran. 13 → 4 vulnerabilities; the remaining 4 are in `serialize-javascript` via `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser`. Build-time only, fix would require a breaking downgrade of `vite-plugin-pwa` — not worth it.
- ⏸️ **P2-17.** Deferred to a P3 batch covering TS 5 → 6, TanStack minor bumps, React 19.2 patch, and other major dep updates together.
- ✅ **P2-18.** `public/_headers` shipped with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS (1 year + subdomains), `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` limiting `camera` to self and blocking mic/geolocation. CSP is in **Report-Only** mode initially — covers `'self'`, Supabase REST/edge/realtime (`https://*.supabase.co` + `wss://*.supabase.co`), inline styles for Mantine, data:/blob: images for camera capture. **Action on you:** after the next deploy, open DevTools → Console on the live app and exercise the main flows (list, add, photo upload, AI enrichment, dashboard). Any `[Report Only] Refused to ...` warnings tell us what to add to the policy. Once clean, flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy` to enforce.

### MCP server
- ✅ **P2-19.** Token caveat documented in `mcp-server/README.md`.

---

## Outstanding work

- **P2-11** — WCAG AA contrast audit of the grape theme (axe DevTools or WAVE).
- **P2-18 follow-up** — after the deploy that ships the new `_headers`, exercise the app and check the browser console for CSP violations. Tighten the policy if any legitimate flows are blocked, then flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy` to enforce.

## Deferred to P3 (future batch)

- **P2-17** — major dependency updates: TS 5 → 6, react-i18next 16 → 17, TanStack libs minor bumps, React 19.2 patch. Group these together and budget time for testing breaking changes.

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
