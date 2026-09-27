# Receipt Scanner — Web

React (Vite + TypeScript + Tailwind) frontend for the receipt scanner.
Talks to the FastAPI backend in `../backend`.

## Run it

Make sure the backend is running first (`docker compose up` in `../backend`),
then:

```bash
npm install
npm run dev
```

Open http://localhost:5173. It's already configured to talk to
`http://localhost:8000` (see `.env`).

## Pages

- **Login/Signup** (`/login`) — auto-logs in right after signup
- **Dashboard** (`/`) — stat tiles, spend-by-category chart, searchable/
  filterable receipt table, CSV export
- **Upload** (`/upload`) — drag-and-drop or click to browse
- **Review** (`/receipts/:id`) — polls while the receipt is processing,
  then shows editable fields with low-confidence ones highlighted in amber

## Structure

```
src/
├── api/         fetch client (JWT handling), shared types
├── hooks/       useAuth (login/signup/logout, token storage)
├── components/  Layout, StatusPill, SpendChart
└── pages/       Login, Dashboard, Upload, Review
```

## Config

`.env` — `VITE_API_BASE_URL` points at the backend. Change this when you
deploy the backend somewhere other than localhost.
