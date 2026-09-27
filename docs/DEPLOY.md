# Deploying the backend (Render)

## 1. Deploy via Blueprint

1. Go to https://dashboard.render.com/blueprints
2. Click **New Blueprint Instance**
3. Connect the `sobanrb404/receipt-scanner` GitHub repo
4. Render reads `render.yaml` from the repo root automatically and shows
   you a preview: one web service (`receipt-scanner-api`) + one free
   Postgres database (`receipt-scanner-db`)
5. It'll prompt you for `GEMINI_API_KEY` — paste your key from
   https://aistudio.google.com/app/apikey (same one from your local `.env`)
6. Click **Apply** — Render builds the Docker image and provisions the
   database. First build takes a few minutes.

`JWT_SECRET_KEY` is generated automatically and randomly by Render — you
don't need to set it.

## 2. Get your live URL

Once deployed, Render gives you a URL like
`https://receipt-scanner-api.onrender.com`. Check it's alive:

```bash
curl https://receipt-scanner-api-XXXX.onrender.com/health
```

Should return `{"status":"ok"}`.

## 3. Point the web app and mobile app at it

- **Web**: update `web/.env` — `VITE_API_BASE_URL=https://your-render-url.onrender.com`
- **Mobile**: update `mobile/eas.json`'s `preview` profile env, and
  `mobile/.env` for local Expo Go testing

## ⚠️ Known limitations of the free tier (read before relying on this)

**1. Cold starts.** The free web service spins down after 15 minutes of
no traffic. The next request wakes it back up, which takes 30-60 seconds.
Fine for a portfolio demo people click into occasionally; not fine for
something that needs to always feel instant.

**2. The database expires after 30 days** on Render's free Postgres,
unless upgraded to a paid plan. Fine for a resume project's demo window;
not a permanent home for real data.

**3. Uploaded receipt images don't persist reliably.** Render's free web
service has an *ephemeral* filesystem — anything written to disk
(`UPLOAD_DIR`, where receipt photos are saved) can be wiped whenever the
service restarts, redeploys, or wakes from sleep. Since OCR + extraction
happen once, right after upload, in the same process lifetime, this is
usually fine in practice — but nothing guarantees the original photo
stays available afterward, and if a restart happens mid-processing, that
job is lost. **This is a real limitation of the free tier, not something
this session tried to work around** — a production version of this app
would store images in object storage (e.g. Cloudflare R2's free tier, or
S3) instead of local disk. Worth knowing if you demo this in an interview
and get asked "what would you change for production."
