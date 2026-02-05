# Taste That Wine

A mobile-first web app for wine tasting sessions.

## What is implemented

- Bottle photo capture from mobile camera.
- Auto-fill attempt from photo via `POST /api/wines/lookup`.
- Manual wine entry fallback (name, winery, vintage, country).
- Session + participant setup.
- Rating from 1 to 5 for each selected wine.
- Backend endpoints ready to persist sessions/ratings in Airtable.

## Project structure

- `index.html`, `styles.css`, `app.js`: static frontend (GitHub-deployable).
- `backend/server.js`: minimal Node/Express backend API.

## Do you need a backend?

Yes - **recommended** for real usage.

You can host frontend directly from GitHub Pages, but backend is needed to:
- keep Airtable and lookup API keys private,
- validate score values (1..5),
- centralize writes to Airtable,
- add caching/rate-limit later.

## Run locally

```bash
npm install
npm run start
```

Open `http://localhost:8787` if you serve frontend through the same server/proxy.

For quick frontend preview only:
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173`.


### Troubleshooting (Windows)
If `http://localhost:8787` shows `Cannot GET /`:
1. Ensure you started the Node backend from the project root (the folder containing `index.html` and `package.json`).
2. Pull the latest code (server now explicitly serves `index.html` on `/`).
3. Restart the backend:

```bash
npm run start
```

## Airtable configuration

Set these environment variables before starting backend:

- `AIRTABLE_BASE_ID`
- `AIRTABLE_TOKEN`

Backend writes:
- `POST /api/sessions` -> `Sessions` table.
- `POST /api/ratings` -> `Ratings` table.

If env vars are missing, API still responds but skips Airtable write.

## Next steps

1. Replace demo lookup response in `/api/wines/lookup` with a real wine provider.
2. Add table mapping from frontend wines to Airtable `Wines` table.
3. Add authentication for private tasting sessions.
