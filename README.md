# Taste That Wine

A mobile-friendly companion for wine tasting sessions.

## Product goal
Create a simple app where tasting participants can:
1. Take a picture of a wine bottle.
2. Auto-fill bottle information from an online wine data source when possible.
3. Manually complete or correct bottle data.
4. Join a tasting session, select a wine, and rate it from **1 to 5**.
5. Store all tasting data in **Airtable**.

---

## Recommended architecture

### Frontend (GitHub-hosted)
Use a mobile-first web app deployed from GitHub:
- **Framework**: Next.js or React + Vite (PWA mode).
- **Hosting**: GitHub Pages (static) or Vercel/Netlify if server features are needed.
- **Features**:
  - Camera capture (`<input type="file" accept="image/*" capture="environment">`).
  - Session screen with list of wines.
  - Rating control (1–5).
  - Offline-friendly caching (optional, through PWA service worker).

### Data storage
Use **Airtable** with at least these tables:
- `Wines`: name, winery, vintage, country, grape, region, image, external_id.
- `Sessions`: title, date, host.
- `Participants`: name, session.
- `Ratings`: wine, participant, score (1–5), comment (optional), session.

### External wine data
To enrich bottle info, integrate one provider:
- Vivino-like lookup APIs (if terms allow).
- Wine-Searcher-compatible API.
- General image+text extraction workflow (OCR + search).

---

## Do you need a backend?

**Short answer: yes, recommended.**

You can build a frontend-only MVP, but a backend is strongly advised for production because:

1. **API key security**
   - Airtable and wine lookup API keys must not be exposed in frontend code.
2. **Rate limiting and caching**
   - A backend can cache wine lookups and reduce API calls.
3. **Data validation**
   - Enforce valid 1–5 scores and required session fields.
4. **Future features**
   - User auth, anti-spam, moderation, advanced scoring models.

### Minimal backend option
A small API layer is enough:
- **Option A**: Serverless functions (GitHub + Cloudflare Workers / Vercel Functions).
- **Option B**: Tiny Node.js API (Fastify/Express).

Endpoints example:
- `POST /api/wines/lookup` (image/text -> wine candidates)
- `POST /api/sessions`
- `POST /api/ratings`
- `GET /api/sessions/:id/results`

---

## MVP development plan

### Phase 1: Core tasting flow
- Create session.
- Add wine manually.
- Participant submits 1–5 score.
- Store records in Airtable.

### Phase 2: Bottle photo + auto-fill
- Capture bottle photo.
- OCR + search integration.
- Human confirmation before saving.

### Phase 3: Better tasting logic
- Weighted notes.
- Blind tasting mode.
- Session leaderboard and export.

---

## Suggested first sprint
1. Define Airtable schema.
2. Build mobile session UI (list wines + 1–5 rating).
3. Add backend endpoint to write/read Airtable.
4. Add photo upload and mock lookup provider.
5. Deploy frontend from GitHub.

---

## Deployment note
If you deploy frontend directly from GitHub as static files, pair it with serverless backend endpoints so credentials remain private.

