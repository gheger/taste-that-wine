# Taste That Wine

A mobile-first web app to run a shared wine tasting session: add wines, select one, and capture each taster’s score + notes.

## What it does

- Join an existing tasting session with a **session code** and your **name**.
- Add wines (photo + details) to the active session.
- Score wines on a **10–100 stepped scale** with tasting labels.
- Write/update ratings per **Session + Participant + Wine**.
- Display a tasting table with per-participant “dégusté” status.

## Project structure

- `index.html`, `styles.css`, `app.js`: static frontend.
- `backend/server.js`: Node/Express API for Airtable + session join.

## Run locally

```bash
npm install
npm run start
```

Open `http://localhost:8787`.

For frontend-only preview:
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173` (API calls won’t work without the backend).

## Deploy

You can deploy the **backend** to any Node host and serve the **frontend** either:
- from the same backend (recommended), or
- from static hosting (GitHub Pages, Netlify, etc.) and point to the backend URL.

Minimal deployment steps:
1. Deploy `backend/server.js` with Node 18+.
2. Set environment variables (see Airtable section below).
3. Ensure the backend can serve static files from the project root (already configured).
4. Point your domain to the backend (or keep the frontend static and proxy API calls).

## Airtable setup

Set these environment variables before starting the backend:

- `AIRTABLE_BASE_ID`
- `AIRTABLE_TOKEN`

### Tables and fields (exact names)

**Sessions**
- `Name` (text)
- `Host` (text, optional)
- `Code` (text, the session code users enter)
- `Status` (text, use `active` for joinable sessions)
- `Date` (datetime, optional)

**Wines**
- `SessionName` (text)
- `Name` (text)
- `Winery` (text)
- `Vintage` (text)
- `Country` (text)
- `Source` (text)
- `ImageBase64` (long text)

**Ratings**
- `SessionName` (text)
- `Participant` (text)
- `WineId` (text)
- `Score` (number)
- `Notes` (long text)

### Notes

- The frontend **does not create sessions**. Create them directly in Airtable by setting:
  - `Code` (e.g., `GH40`)
  - `Status` = `active`
  - `Name` (e.g., `Default Session`)
- A rating is **upserted**: if a rating exists for the same `SessionName + Participant + WineId`, it is updated.
- If Airtable env vars are missing, the API responds but skips writes.

## API endpoints (backend)

- `POST /api/sessions/join` → validates a `code` and returns the session name.
- `GET /api/wines?session=SessionName`
- `GET /api/ratings?session=SessionName`
- `POST /api/wines`
- `POST /api/ratings`

## Troubleshooting (Windows)

If `http://localhost:8787` shows `Cannot GET /`:
1. Start the backend from the project root (folder containing `index.html`).
2. Restart the backend:
   ```bash
   npm run start
   ```
