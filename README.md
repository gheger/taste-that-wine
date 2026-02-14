# Taste That Wine

A mobile-first web app to run a shared wine tasting session: add wines, select one, and capture each taster’s score + notes.

## What it does

- Join an existing tasting session with a **session code** and your **name**.
- Add wines (photo + details) to the active session.
- Score wines on a **0–100 stepped scale** with tasting labels.
- Write/update ratings per **Session + Participant + Wine** (auto-save).
- Display a tasting table with per-participant “dégusté” status.
- Mark favorites (Coup de coeur) and view a favorites list.
- Open Vivino search links from Notes and Classement.

## Project structure

- `index.html`, `styles.css`, `app.js`: static frontend.
- `backend/worker.js`: Cloudflare Worker API for Airtable + session join.

## Run locally

```bash
npm install
npm run dev:worker
```

Wrangler will print a local Worker URL (typically `http://127.0.0.1:8787`).

For frontend-only preview:
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173` (API calls won’t work without the Worker).

## Deploy

### Frontend (GitHub Pages)

1. GitHub repo → **Settings** → **Pages**.
2. Source: `Deploy from a branch`, Branch: `main`, Folder: `/root`.
3. Your site will be available at `https://<user>.github.io/<repo>/`.

### Backend (Cloudflare Worker)

This project includes a Cloudflare Worker in `backend/worker.js`.

1. Install Wrangler:
   ```bash
   npm install
   ```
2. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```
3. Set secrets:
   ```bash
   npx wrangler secret put AIRTABLE_BASE_ID
   npx wrangler secret put AIRTABLE_TOKEN
   ```
4. Deploy:
   ```bash
   npm run deploy:worker
   ```

After deploy, Wrangler outputs your API URL (e.g. `https://taste-that-wine-api.<account>.workers.dev`).
Set that URL in `index.html`:
```html
<script>
  window.API_BASE = "https://taste-that-wine-api.gheger.workers.dev";
</script>
```

If you rename or recreate the Worker later, update `window.API_BASE` and reset secrets:
```bash
npx wrangler secret put AIRTABLE_BASE_ID
npx wrangler secret put AIRTABLE_TOKEN
npm run deploy:worker
```

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
