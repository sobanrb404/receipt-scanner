# Setup — things only you can do

Claude can't enter your sudo password or create accounts on your behalf, so
these steps are yours. Everything else is already built and tested.

## 1. Install Docker (blocking — do this first)

```bash
sudo apt install docker.io docker-compose-v2
```

Then let your user run Docker without `sudo` every time:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Check it worked:

```bash
docker --version
docker compose version
```

## 2. Get your free Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API key"
4. Copy it

Open `receipt-scanner/backend/.env` and paste it in:

```
GEMINI_API_KEY=paste-it-here
```

That file is gitignored — it will never be committed.

## 3. Run the backend

```bash
cd receipt-scanner/backend
docker compose up --build
```

First run takes a minute or two (installs Tesseract + Python deps inside
the container). Leave this running in its own terminal.

## 4. Test it end-to-end

Open **http://localhost:8000/docs** in your browser and, in order:

1. `POST /auth/signup` — email + password (8+ characters)
2. `POST /auth/login` — copy the `access_token` from the response
3. Click **Authorize** (top right) and paste the token in
4. `POST /receipts` — upload a photo of a real receipt (from your phone,
   AirDropped/emailed to this machine, or any receipt image you have)
5. Wait a few seconds, then `GET /receipts/{id}` using the id from step 4 —
   `status` should move from `processing` to `confirmed` or `needs_review`
6. `GET /export/csv` — should download a CSV with that receipt in it

## What to report back

Tell me:
- Did `docker compose up` succeed, or did it error out? (paste the error)
- Did steps 1–3 (signup/login) work?
- Did the receipt actually get read correctly — right vendor, date, total?
  Or did it come back empty / wrong?

That tells me whether Phase 2 (web frontend) can start clean, or whether
something in Phase 1 needs a fix first.
