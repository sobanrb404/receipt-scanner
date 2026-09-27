# Changelog

Dated log of what was built, in what order, and why. Newest entries at the
top. See [ROADMAP.md](./ROADMAP.md) for what's planned next.

## 2026-09-28 — Real root cause of the login failure: API URL missing from cloud builds

**After the commit fix, still the exact same login error.** Checked further
and found the actual, deeper cause: `.env` is (correctly) gitignored, so
even with everything else committed, `EXPO_PUBLIC_API_BASE_URL` was never
present on EAS's build servers. The app silently fell back to its
hardcoded default, `http://localhost:8000` — which on a real phone means
the *phone itself*, not the dev machine. Every request was guaranteed to
fail regardless of the earlier cleartext-HTTP fix (which was real and
still needed, just not the whole story). This also explains a line in the
very first build log that wasn't flagged clearly enough at the time:
*"No environment variables ... found for the 'preview' environment on EAS."*

**Fixed**: added an explicit `env` block to the `preview` profile in
`eas.json`, baking `EXPO_PUBLIC_API_BASE_URL` in directly for cloud
builds (this doesn't touch `.env`, which stays local-only and gitignored
as it should). Committed immediately this time.

**Known limitation, not a bug**: this hardcodes today's LAN IP
(`192.168.1.119`) into the build. If this machine's IP changes (new DHCP
lease, different network) or you test from a different network than this
laptop's, the built APK needs `eas.json` updated and rebuilding — a real
deployed backend (Phase 4) removes this problem entirely by giving the
app a stable public URL instead of a LAN IP.

## 2026-09-28 — Root cause of "same login error after rebuild": nothing was ever committed

**Bug**: rebuilt the APK after the cleartext-HTTP fix, but got the exact
same login failure. Checked `.env`, the LAN IP, and the backend health
first (all fine) before checking the one thing that actually explained
it: `git status` on `mobile/` showed **the entire app had never been
committed** — `create-expo-app` initializes its own git repo, and every
file since then (`app.json`'s cleartext fix, the whole `app/` and `src/`
folders, the FormData upload fix, everything) was either modified-but-
uncommitted or completely untracked.

**Why this broke the rebuild**: EAS Build archives and uploads your
project based on git state. With nothing committed, every `eas build` run
so far had been building from stale/incomplete code — **none of this
session's fixes had actually reached any APK**, even though they were
correctly saved to disk and verified via Expo Go (which reads the working
directory directly, not git).

**Fixed**: staged and committed everything (`git add -A && git commit`),
confirmed `.env` itself stayed correctly excluded (only `.env.example` is
tracked) and the working tree is now clean.

**Waiting on you**: rebuild one more time — this one should actually
contain every fix from this session:
```bash
cd ~/Documents/workspace/resume/receipt-scanner/mobile
npx eas-cli build --platform android --profile preview
```

## 2026-09-28 — Web: labeled the date range filter (From/To)

**Fixed**: the two date-range inputs on the Dashboard looked identical
side by side with no indication of which was the start and which was the
end — confusing at a glance. Added small "From"/"To" labels above each
one and a "–" separator between them, so the pair reads clearly as a
range. Verified visually in the browser.

## 2026-09-28 — Fixed period pills squeezing/expanding on real Android

**Bug** (reported after real-device testing, not caught by the web
stand-in used to verify the previous change): the period filter pills
looked squeezed on load and would visibly expand/resize when tapped.

**Root cause**: a horizontal `ScrollView`'s height on Android isn't always
stable from its content until something forces a remeasure — tapping a
pill triggered a re-render that happened to fix the layout, which is why
it looked "broken then fixed itself" specifically on interaction. This is
a known class of native `ScrollView` sizing quirk that a web preview can't
reproduce, since React Native Web's `ScrollView` doesn't share the same
layout engine.

**Fixed**: replaced the horizontal `ScrollView` with a plain wrapping
`View` (`flexWrap: "wrap"`) — 5 short pills fit on one or two lines at
any normal phone width, so there's no real need for horizontal scrolling,
and a wrapping flex row has none of `ScrollView`'s native measurement
quirks.

**Not re-verified on your phone yet** — this session's web stand-in can't
reproduce (or disprove) native-only layout bugs like this one, so this
needs your confirmation on the real device once more.

## 2026-09-28 — Mobile: period filters + manual entry (parity with web)

**Added**
- Period filter pills on the History screen — All time / This week / This
  month / This year / Last month — reusing the exact same date-math logic
  as the web app (`src/utils/dateRanges.ts`, copied verbatim since it's
  pure logic with no DOM dependency)
- **Add manually** screen (`app/(app)/manual.tsx`) — vendor, date, total,
  tax, currency, category (as tappable chips instead of a `<select>`,
  since that's the natural mobile equivalent). Saves via the same
  `POST /receipts/manual` endpoint as web.
- A second button next to "+ Scan receipt" on the History screen linking
  to it

**Fixed during verification**: the period pills initially rendered as
stretched ovals instead of compact pills — a React Native flexbox default
(a horizontal `ScrollView`'s content container stretches children to fill
its height unless told otherwise). Fixed with `alignItems: "center"`.

**Verified** via Expo's web target: seeded multi-month data, confirmed
each period pill correctly filters the list/stat tiles; filled out and
submitted the manual-entry form end-to-end, confirmed it saved correctly
and landed on the review screen with the right vendor/total/category.

**This is a JS-only change** — no new native dependencies, so it doesn't
need a new EAS build. Reload in Expo Go to see it.

## 2026-09-28 — Fixed receipt upload ("Unsupported FormDataPart implementation")

**Bug**: uploading a photo failed every time with "Upload failed. Try
again." First fixed the error-swallowing in `capture.tsx` (it was showing
a generic fallback instead of the real error) to get the actual message:
`Error: Unsupported FormDataPart implementation`.

**Root cause**: traced into `node_modules` (not guessed) to
`expo/src/winter/fetch/convertFormData.ts` — Expo SDK 57 ships its own
`fetch`/`FormData` implementation, and it explicitly does **not** support
the classic React Native `{uri, name, type}` object shape we were using
for the uploaded file (the source even has a comment saying so). It only
accepts a string, a real `Blob`, or an object with a `.bytes()` method.

**Fixed**:
- Installed `expo-file-system` and switched `compressReceiptImage()`
  (`src/utils/imageCompress.ts`) to return a real `File` instance
  (`new File(uri)`) instead of a plain `{uri, name, type}` object — `File`
  implements the `Blob` interface (including `.bytes()`), which is exactly
  what Expo's new FormData conversion checks for
- Updated `api.upload()` (`src/api/client.ts`) to accept that `File` type;
  turned out TypeScript accepts `formData.append("file", file)` cleanly
  with no cast needed, since `File` genuinely satisfies `Blob`

**Verified**: `tsc --noEmit` clean, `expo-doctor` 21/21. Not yet
re-verified against a real upload (needs you to retry in Expo Go — should
hot-reload automatically since the dev server is already running).

**Confirmed fixed on a real device**: after a stale Expo Go bundle first
made it look like the fix hadn't worked (identical error, but traced
Expo's own patch code to confirm the fix *should* resolve it), a full
reload confirmed it actually did — real photo, real upload, real
extraction, correct vendor/date/total on the review screen. The full
mobile pipeline (camera → compress → upload → OCR → Gemini → review) is
now verified end-to-end on physical hardware, not just via the web
stand-in this session used earlier.

## 2026-09-28 — Fixed login failure on the installed APK (cleartext HTTP blocked)

**Bug**: the installed APK couldn't log in, even on the same Wi-Fi as the
backend. **Root cause**: Android blocks plain HTTP network requests by
default for apps built for release (API 28+) — the backend runs on plain
`http://192.168.1.119:8000`, no HTTPS, so every request from the app was
silently blocked by Android itself before it ever reached the server. This
only affects a real installed build; Expo Go is more permissive, which is
why nothing caught this earlier.

**Fixed**: installed `expo-build-properties` and configured
`usesCleartextTraffic: true` for Android in `app.json`, which allows the
app to make plain-HTTP requests. Verified `expo-doctor` (21/21) and valid
JSON after the change.

**⚠️ Security note for later**: `usesCleartextTraffic: true` allows HTTP to
*any* host, app-wide — acceptable for now since the backend is only a LAN
dev server, but this should be removed once the backend is deployed with a
real HTTPS URL (Phase 4). A production app should never ship with
cleartext traffic enabled against a public backend.

**Waiting on you**: rebuild the APK (`npx eas-cli build --platform android
--profile preview`), reinstall it (uninstall the old one first — same
package name, should update cleanly, but uninstall/reinstall if Android
complains), and retry login.

## 2026-09-28 — Fixed EAS Build failure (npm install conflict)

Your first `eas build` failed during the "Install dependencies" phase.
Rather than guess, the real cause was already known from earlier in this
session: installing this project's dependencies locally hits an npm
`ERESOLVE` peer-dependency conflict from Expo's own dev-tooling
(`vaul`/`@radix-ui`, pulled in by `@expo/ui` via `expo-router` — nothing
to do with any of our app code). EAS Build's cloud install step runs a
plain `npm install`, which hits the identical conflict.

**Fixed**: added `mobile/.npmrc` with `legacy-peer-deps=true`, so npm
installs cleanly everywhere (locally and in EAS's cloud build) without
needing the `--legacy-peer-deps` flag typed by hand each time.

**Verified**: deleted `node_modules` entirely and ran a clean `npm install`
with only the new `.npmrc` in place (no manual flag) — installed
successfully. Re-ran `expo-doctor` (21/21 checks) and `tsc --noEmit`
(clean) afterward to confirm nothing else broke.

## 2026-09-28 — EAS Build configured for a downloadable APK

**Context**: the goal isn't just to run the app on your own phone via Expo
Go — you want a "Download for Android" button on the web app's Dashboard
that lets **anyone** install the app directly, free, no Play Store. That
needs a real `.apk` file, which Expo Go can't produce (it only runs a
project through the Expo Go app + a live dev server).

**Added**
- `mobile/eas.json` — configures the `preview` build profile to output an
  installable `.apk` (EAS's default is a Play-Store-only `.aab`, which
  can't be installed directly — `buildType: "apk"` overrides that)
- `app.json` — added the required Android `package` identifier
  (`com.sobanrb404.receiptscanner`)
- `mobile/README.md` — step-by-step EAS Build instructions

**Why EAS Build over a local build**: this machine has no Java, Android
SDK or Gradle installed, and installing that whole toolchain just to build
one APK would be heavy. EAS Build runs the actual build on Expo's free
cloud infrastructure — nothing runs locally except a small CLI that
uploads the code and later downloads the finished file.

**Waiting on you** (needs your own account — I can't create one or log in
on your behalf):
1. Sign up free at https://expo.dev/signup
2. `npx eas-cli login`
3. `npx eas-cli build --platform android --profile preview` (~10-15 min,
   runs in the cloud)
4. Send me the resulting `.apk` (or download it to this machine) so I can
   host it and wire up the web Dashboard's download button

## 2026-09-28 — Phase 3: Mobile app (React Native / Expo) built and verified

**Added** (`receipt-scanner/mobile`)
- Scaffolded with `create-expo-app` (Expo SDK 57), restructured to use
  **Expo Router** (file-based routing) per this session's own Expo agent
  guidance, not manually-wired React Navigation
- Auth: `Stack.Protected` guard pattern in the root layout — signed-out
  users only ever see `sign-in`, signed-in users only ever see the `(app)`
  group; JWT stored via `expo-secure-store` (the OS keychain)
- **Sign in** screen — same accounts as the web app, same backend
- **Receipts** (history) screen — stat tiles, pull-to-refresh, refetches on
  every focus (not just first mount) via `useFocusEffect`
- **Capture** screen — `expo-image-picker` (camera or library), image
  compressed via `expo-image-manipulator` (resized to 1600px wide,
  JPEG quality 0.8) before upload
- **Review** screen — polls every 2s while processing, editable fields,
  low-confidence fields flagged, inline delete confirmation
- Shared theme (`src/utils/theme.ts`) uses the same palette as the web app
  so both read as one product

**Fixed during verification** (found by actually running it, not by
reading the code):
1. Missing `react-native-worklets` peer dependency (`expo-doctor` caught
   this — `npx expo install` alone didn't pull it in)
2. A deep transitive peer-dependency conflict from Expo's own dev-tooling
   subtree (`vaul`/`@radix-ui`, used internally by `@expo/ui`, unrelated to
   any of our app code) — resolved with `--legacy-peer-deps`, the standard
   workaround for this well-known Expo/npm interaction
3. `StyleSheet.absoluteFillObject` doesn't exist in this RN version — caught
   by `tsc --noEmit` (the correct name is `absoluteFill`)
4. `expo-secure-store` has no web implementation at all — added a
   `Platform.OS === "web"` fallback to `localStorage` so the app doesn't
   crash if ever previewed in a browser (this app targets iOS/Android; the
   fallback exists only for that preview path)
5. **A real bug that would affect real usage**: `router.back()` throws
   `"The action 'GO_BACK' was not handled by any navigator"` when the
   Review screen is reached with no navigation history behind it (e.g. a
   direct deep link, or — as this session hit while testing — navigating
   straight to a receipt URL). Fixed with a `router.canGoBack()` check that
   falls back to the receipts list instead of leaving the user stuck.

**Verified**: since no phone/emulator is available in this environment,
verified via Expo's web target (`npx expo start --web`) as a stand-in for
UI/navigation/logic, plus direct API calls to seed test data. Confirmed:
signup → login → auth guard correctly switches screens, the history list
renders and refetches on focus, deep-linking straight to a receipt route
works, editing/deleting a receipt works end-to-end, and the delete-with-no-
history bug above is fixed. `tsc --noEmit` and `expo-doctor` both clean
(21/21 checks).

**Not verified — needs a real device**: the actual camera capture flow.
`expo-image-picker`/`expo-image-manipulator` require real camera/photo
hardware that this environment doesn't have.

**Waiting on you**: install **Expo Go** on your phone, run `npx expo start`
in `mobile/`, scan the QR code, and test taking an actual photo of a
receipt end-to-end — that's the one thing this session couldn't verify.

## 2026-09-28 — Period filters (week/month/year) + exports that respect them

**Added**
- Dashboard: one-click period pills — **This week / This month / This year /
  Last month / All time** — set the date filter instantly instead of
  picking two dates by hand
- `GET /export/csv` now accepts the same filters as `GET /receipts`
  (`vendor`, `category`, `date_from`, `date_to`, `q`) via a shared
  `apply_receipt_filters()` helper, so **the CSV always matches what's
  filtered on screen** instead of always exporting everything
- Downloaded filename reflects the range, e.g.
  `receipts_2026-09-01_to_2026-09-28.csv`, and the Export button's label
  shows the active period so it's clear what you're about to download
- Manually editing either date input clears the active period pill (marks
  it a custom range) so the UI never shows a stale "This month" highlight
  after you've picked different dates

**Fixed — two real bugs, both caught by actually running it, not by
reading the code**:
1. **Silent data truncation**: `GET /receipts` defaulted to `limit=50`,
   which meant the dashboard's charts and totals were quietly wrong for
   any account with more than 50 receipts — a growing list would look
   fine at a glance while actually excluding older data. Raised the
   default to 1000 (documented as a stopgap; real pagination is the
   correct long-term fix if this app ever holds thousands of receipts per
   account).
2. **Timezone bug in the period presets**: `toISODate()` used
   `date.toISOString()`, which converts to UTC first — on this machine
   (UTC+5), local midnight on the 1st of the month rolled back to
   `08:31 PM` UTC the *previous* day, so "This month" silently started
   one day early (`2026-08-31` instead of `2026-09-01`). Fixed by
   formatting from the date's local year/month/day instead of its UTC
   ISO string. Caught by actually clicking the button and reading the
   resulting date inputs, not by inspecting the function in isolation.

**Verified**: seeded 5 receipts spanning 3 different months (2025, last
month, this month), clicked through all 5 period pills in the running
app, confirmed each one filtered the chart/table/stat-tiles to the right
subset, and confirmed the CSV export via a direct API call returned only
the 3 September receipts with the correct filename.

## 2026-09-28 — Icon actions + manual receipt entry

**Added**
- `web`: Edit/Delete actions on the dashboard table are now icons (pencil /
  trash, via `lucide-react`) instead of text links — cleaner and more
  compact in a dense table
- **Manual receipt entry** — a full feature, not just a UI form:
  - `POST /receipts/manual` (backend): create a receipt directly from typed
    fields (vendor, date, total, tax, currency, category) with no photo at
    all — for cash purchases or lost receipts. Saved straight as
    `confirmed` since there's no OCR/LLM step to review.
  - `Receipt.image_path` is now nullable, and a new `Receipt.source` column
    (`"scanned"` | `"manual"`) distinguishes the two paths
  - `web/src/pages/ManualReceipt.tsx` — a form at `/manual`, linked from a
    new "Add manually" button on the dashboard
  - 3 new backend tests covering creation, validation (total must be > 0),
    and that manual receipts show up in the list correctly

**Fixed during verification** (a real bug, not just a design choice):
- Adding the `source` column and making `image_path` nullable broke
  `GET /receipts` with a 500 error on the already-running database —
  because this project only ever uses `Base.metadata.create_all()`, which
  creates missing *tables* but never alters existing ones. Caught this by
  actually calling the API after the change, not just by reading the code.
  Fixed by applying a manual `ALTER TABLE` (documented below) instead of
  wiping the dev database, so existing data wasn't lost. **This is the
  first real cost of skipping Alembic migrations** — worth switching to
  real migrations before this ever holds data that matters.

**Verified**: full click-through in the browser — filled out the manual
entry form, saved it, landed on the review screen showing `Confirmed` with
the right vendor/total, saw it appear correctly in the dashboard chart and
table, deleted it via the new icon button, confirmed via a follow-up API
call that it was actually gone.

**If you already had the backend running before this change**: your
database needs the same migration applied. Run this once (safe — doesn't
touch existing rows):
```sql
ALTER TABLE receipts ALTER COLUMN image_path DROP NOT NULL;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS source VARCHAR NOT NULL DEFAULT 'scanned';
```

## 2026-09-27 — Extraction accuracy fix + edit/delete from the dashboard

**Root cause found** for the wrong-amount bug reported on a real bank
terminal receipt: I queried the database directly for the account
`sobanrb404@gmail.com` and found Tesseract's raw OCR output was almost
completely garbled on that photo (blurry thermal-paper receipt) —
e.g. it read the amount as `"S95"` instead of `"395"`. Gemini extracted
`595` from that garbled text, which was a reasonable read of bad input, not
a Gemini bug. **The real issue: text-only OCR is fundamentally unreliable
on blurry photos, and there's no recovering the right answer once the text
is already wrong.**

**Fixed** (`backend/app/services/extract.py`, `services/ocr.py`,
`jobs/process_receipt.py`)
- Extraction now sends Gemini the **receipt image directly** (multimodal),
  with Tesseract's OCR text passed along only as a secondary hint. Gemini's
  vision understanding reads the actual pixels and is far more robust to
  blur/skew/glare than classical OCR — there's no text-extraction step to
  lose information at.
- Prompt updated to explicitly tell Gemini the image is the source of
  truth, OCR text may be wrong, and to give low confidence for anything it
  can't make out even in the image (never guess silently).
- OCR preprocessing improved as a secondary defense: upscales small/low-res
  photos before running Tesseract, and switched from a single global (Otsu)
  threshold to adaptive per-region thresholding, which handles unenven
  lighting/glare on phone photos much better.

**Verified twice**:
1. Re-uploaded the earlier synthetic test receipt — total came back exact
   (1785.00, was 1785.68 with text-only OCR).
2. **Re-tested the actual failing real-world receipt** — the user shared
   the real ALTPAY/Shell fuel photo. Uploaded it through the fixed pipeline
   and every field came back correct: vendor `EXPO CENTRE FILLING STATION`
   (was `ALTPAY`), total `393.32` (was `595.00`), date `2026-09-17` (was
   null), category `transport` (was `other`), plus a correctly extracted
   line item (`SHELL SUPER — 393.32`) that wasn't captured at all before.
   Confirms the root-cause fix resolves the actual reported bug, not just
   a synthetic case.

**Added — edit/delete from the dashboard** (`web/src/pages/Dashboard.tsx`,
`Review.tsx`)
- New "Actions" column on every dashboard row: **Edit** (jumps to the
  review screen) and **Delete** (inline confirm, no page navigation needed)
- Replaced the browser's native `confirm()` dialog on both the dashboard
  and the review page with an inline "Delete this receipt? Yes / Cancel" —
  more reliable across browsers/embedded webviews and better UX than a
  blocking native dialog
- Deleting from the dashboard updates the list and stat tiles immediately,
  no full reload

**Verified**: seeded a test receipt, deleted it via the new dashboard
button, confirmed the row and stats updated instantly and the record was
actually gone via a follow-up API call.

## 2026-09-27 — Dashboard: 5 chart views instead of 1

**Added** (`web/src/components/charts/`)
- Restructured the single `SpendChart` into a `charts/` folder with a
  `shared.tsx` module (palette, tooltip style, empty-state, and the
  data-aggregation functions each chart needs — grouping by day, vendor,
  category, and this-month-vs-last-month)
- **By category** (existing bar chart, kept)
- **Over time** — area chart of daily spend
- **Top vendors** — horizontal bar, top 5 by total spend
- **Category share** — donut chart, same category data as a proportion
- **This vs last month** — two bars with a computed "+X% vs last month" delta
- Dashboard's chart card is now a single tabbed panel switching between all 5,
  instead of stacking multiple charts vertically

**Fixed during verification**:
- `tsc -b` caught nothing new here, but the manual test run did: my own
  *test-seeding script* raced the background OCR/Gemini job (patched a
  receipt's fields before extraction had finished, so the job's real
  extraction overwrote the seeded data moments later). Not an app bug — the
  real Review page always waits for `status !== "processing"` before
  showing the edit form, so a real user can't hit this. Worth documenting
  since it's exactly the kind of race a background job can hide.
- What looked like a rendering bug (monthly comparison bars invisible) was
  actually Recharts' bar grow-in animation caught mid-frame by a screenshot
  taken too early — confirmed by inspecting the SVG directly (bars were
  there with correct geometry) and re-screenshotting a moment later.

**Verified**: seeded 9 receipts across 4 categories/2 months via the API,
clicked through all 5 tabs in the running app, confirmed each renders
correct data (e.g. "+117%" monthly delta matched the actual seeded totals).
Cleaned up test data afterward.

## 2026-09-27 — Phase 1 confirmed working end-to-end (real test)

Ran the full flow myself against the live Docker backend with your real
Gemini key (`gemini-3.5-flash-lite`): signup → login → upload a synthetic
test receipt → OCR → Gemini extraction → confirmed record.

**Result**: vendor, date, tax, category and all 3 line items extracted
correctly; total was off by $0.68 (1785.68 vs. 1785.00) — likely a Tesseract
OCR misread on the test image, not a code bug. Worth watching once you test
with a real, messier phone photo — that's exactly what the confidence
flagging in Phase 2's review screen is for.

## 2026-09-27 — Phase 2: Web frontend built and verified

**Added** (`receipt-scanner/web`)
- React + TypeScript + Vite + Tailwind v4
- `api/client.ts` — fetch wrapper with JWT auth, typed errors, blob-based
  CSV download (the export endpoint needs an auth header, so a plain link
  wouldn't work)
- `hooks/useAuth.tsx` — login/signup/logout, token in localStorage, signup
  auto-logs in right after
- **Login/Signup** page — single form, toggles mode
- **Dashboard** — stat tiles (total spend, receipt count, needs-review
  count), spend-by-category bar chart (Recharts), searchable/filterable
  table, CSV export
- **Upload** — drag-and-drop + click-to-browse
- **Review** — polls every 2s while `status: processing`, editable fields,
  fields with confidence < 0.6 highlighted in amber, delete/confirm actions
- Route protection: unauthenticated users are redirected to `/login`

**Fixed during verification**:
- A Recharts `Tooltip` formatter had a type mismatch (`value` can be
  `undefined`) — caught by `tsc`, not by eye
- `React.DragEvent`/`React.ChangeEvent`/`React.ReactNode` type references
  needed explicit `type` imports (Vite's React template doesn't globally
  import the `React` namespace)

**Verified** (via the actual browser, not just code review):
- `tsc -b` — 0 errors
- Signed up a real test account through the running dev server
- Uploaded a file via simulated drag-and-drop → correctly routed to the
  review screen, polled while processing, then showed the low-confidence
  amber highlighting exactly as designed (tested with a blank image on
  purpose, to confirm the "needs review" path works, not just the happy
  path)
- Confirmed the dashboard's empty state and stat tiles render correctly
- Cleaned up test data via the API afterward

**Waiting on you**
- Run `npm install && npm run dev` in `web/` yourself and click through the
  real flow with an actual receipt photo (see `web/README.md`)

## 2026-09-27 — Phase 1: Backend core built and verified

**Added**
- FastAPI project (`backend/app`) with routers for `auth`, `receipts`, `export`
- JWT auth with bcrypt password hashing
- Receipt upload endpoint, saved to disk, processed as a background task
- OCR service (`services/ocr.py`): OpenCV preprocessing (grayscale, blur,
  Otsu threshold) + Tesseract
- LLM extraction service (`services/extract.py`): Gemini call → strict
  Pydantic schema validation → retries once on bad JSON → falls back to a
  flagged "failed" result instead of crashing the job
- Dedupe hashing (`services/dedupe.py`) on vendor + date + total
- CRUD + search/filter endpoints (vendor, category, date range, text search)
- CSV export endpoint
- SQLAlchemy models (`User`, `Receipt`) with confidence-flag JSON column
- Docker + docker-compose (Postgres + API, one command to run both)
- Test suite: 8 tests covering auth flow, dedupe logic, and LLM-output
  parsing — all run against local SQLite, no Docker required

**Fixed during verification** (found by actually running the tests, not
just writing code):
- Missing `email-validator` dependency — `pydantic[email]` wasn't pinned,
  so `EmailStr` fields crashed on import
- `passlib` 1.7.4 + newer `bcrypt` incompatibility — pinned `bcrypt==4.0.1`
- App was creating DB tables against the production (Docker-only) engine
  at *import time*, which broke local test runs outside Docker — moved
  table creation into a FastAPI lifespan handler that only runs at actual
  startup
- Replaced deprecated Pydantic `class Config` with `model_config = ConfigDict(...)`
  and deprecated FastAPI `@app.on_event` with a `lifespan` context manager

**Verified**
- `pytest` → 8 passed, 0 failed (local venv, no Docker)
- `py_compile` clean across all modules

**Waiting on you**
- Docker isn't installed on this machine — install it yourself with
  `sudo apt install docker.io docker-compose-v2` (needs your password, so
  Claude can't run this step)
- Add your free Gemini key to `backend/.env` (`GEMINI_API_KEY=`)
- Run `docker compose up --build` in `backend/` and confirm signup, login,
  upload and extraction work via http://localhost:8000/docs

---

## 2026-09-26 — Planning

- Defined the project concept: OCR + LLM receipt scanner, backend + web +
  mobile
- Chose stack: FastAPI, PostgreSQL, Tesseract/OpenCV, Gemini (free tier),
  React (web), React Native/Expo (mobile)
- Published the architecture blueprint (diagrams, folder structure, build
  order) as an artifact
