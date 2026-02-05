import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());
app.use(express.static(projectRoot));

app.get("/", (_req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

async function airtableCreate(table, fields) {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return { skipped: true };
  }

  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return response.json();
}

app.post("/api/sessions", async (req, res) => {
  try {
    const { name, participant } = req.body;
    if (!name || !participant) {
      res.status(400).json({ error: "name and participant are required" });
      return;
    }

    await airtableCreate("Sessions", {
      Name: name,
      Host: participant,
      Date: new Date().toISOString(),
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/wines/lookup", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "image is required" });
    return;
  }

  // Placeholder response. Replace this block with a real API provider integration.
  res.json({
    name: "Detected Wine (demo)",
    winery: "Unknown Winery",
    vintage: "2020",
    country: "France",
  });
});

app.post("/api/ratings", async (req, res) => {
  try {
    const { sessionName, participant, wineId, score } = req.body;

    if (!sessionName || !participant || !wineId) {
      res.status(400).json({ error: "sessionName, participant and wineId are required" });
      return;
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      res.status(400).json({ error: "score must be an integer from 1 to 5" });
      return;
    }

    await airtableCreate("Ratings", {
      SessionName: sessionName,
      Participant: participant,
      WineId: wineId,
      Score: score,
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Taste That Wine backend listening on ${port}`);
});
