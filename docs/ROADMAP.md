# Roadmap

Status legend: ✅ done · 🔄 in progress · ⏳ not started · 🧍 waiting on you · ⏸️ paused, deferred by choice

## Phase 1 — Backend core
**Status: ✅ built and tested by Claude · 🧍 waiting on you to run it locally**

- ✅ FastAPI project structure
- ✅ Auth (signup/login, JWT, bcrypt)
- ✅ Upload endpoint + image storage
- ✅ OCR pipeline (Tesseract + OpenCV preprocessing)
- ✅ LLM extraction (Gemini) with strict schema validation + retry
- ✅ Background job wiring (OCR → LLM → save)
- ✅ CRUD + search/filter endpoints
- ✅ CSV export
- ✅ Dedupe hashing, confidence-based review flagging
- ✅ Docker + docker-compose
- ✅ 8 automated tests, all passing
- 🧍 **You**: install Docker, add Gemini key, run it once, confirm it works

## Phase 2 — Web frontend (React)
**Status: ✅ built and verified by Claude — ready for you to try**

- ✅ Login / signup screens (auto-logs in right after signup)
- ✅ Upload screen (drag-and-drop + click to browse)
- ✅ Review screen — polls while processing, editable fields, low-confidence
  fields highlighted in amber
- ✅ Dashboard: stat tiles, table, search, date-range filters
- ✅ Chart: spend by category
- ✅ CSV export button
- ✅ Talks to the Phase 1 API — no backend changes needed
- 🧍 **You**: run it locally and try the flow yourself (see below)

## Phase 3 — Mobile app (React Native / Expo)
**Status: ✅ done — fully verified on your real phone, including the camera**

- ✅ Login/signup (same accounts as web)
- ✅ Camera capture screen (photo or library) + client-side image compression
- ✅ Review screen — polls while processing, editable, low-confidence flags
- ✅ History list with stat tiles, pull-to-refresh, delete
- ✅ Same backend, same data — syncs with web instantly
- ✅ Expo Router (file-based routing) with a `Stack.Protected` auth guard
- ✅ `eas.json` configured to build a standalone `.apk` (not Play-Store-only `.aab`)
- ✅ Confirmed end-to-end on your Android phone via Expo Go: signup, login,
  real camera photo, upload, correct OCR/Gemini extraction on the review screen
- ✅ Real `.apk` built via EAS Build; two real-device bugs found and fixed
  along the way — Android blocking plain-HTTP traffic, and an Expo SDK 57
  FormData/upload incompatibility
- ⏸️ **Paused, by choice**: the final APK login issue is a local-dev-only
  problem (the built APK needs your PC's LAN IP baked in, which breaks
  whenever that IP changes) — it disappears once the backend has a real
  public URL from Phase 4, so we're deferring the final rebuild/APK-hosting
  step until after deployment instead of chasing a problem that solves
  itself

## Phase 4 — Polish for the resume
**Status: 🔄 in progress**

- ✅ **Backend deployed and live**: https://receipt-scanner-api-1ss7.onrender.com
  — verified end-to-end against the real URL (signup, login, DB read/write,
  and the full OCR+Gemini pipeline on a real uploaded image)
- ✅ **Web app deployed and live**: https://receipt-scanner-ochre-two.vercel.app
  — verified by actually driving the deployed site: signup, dashboard,
  drag-and-drop upload, full pipeline through to a correctly extracted
  receipt on the review screen
- ✅ Code pushed to GitHub: https://github.com/sobanrb404/receipt-scanner
- ⏳ Accuracy evaluation on a public dataset (SROIE) — real numbers for your resume
- ⏳ GitHub Actions CI (tests run on every push)
- ⏳ Top-level README with architecture diagram + screenshots/GIF
- ⏳ Resume bullet points, written from the finished project
- ⏳ Rebuild the mobile APK pointed at the live URL (removes the LAN-IP
  problem entirely), then wire up the web "Download for Android" button

---

## What's needed from you, by phase

| Phase | What I need from you |
|---|---|
| 1 | ✅ Done — confirmed working with a real extraction test |
| 2 | ✅ Done — verified in the browser, plus period filters, icons, and manual entry added since |
| 3 | ✅ App done, verified on your phone. ⏸️ Final APK/web-download-button step deferred until after Phase 4 (avoids rebuilding every time your LAN IP changes) |
| 4 (now) | A Render account (free, no card needed on the Hobby tier) when we get there |

See [CHANGELOG.md](./CHANGELOG.md) for a dated log of everything built, and [SETUP.md](./SETUP.md) for the exact commands you need to run right now.
