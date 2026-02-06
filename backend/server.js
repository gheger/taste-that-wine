import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import * as vision from "@google-cloud/vision";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const app = express();
const upload = multer();
const visionClient = new vision.ImageAnnotatorClient();
app.use(cors());
app.use(express.json({ limit: "8mb" }));
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

async function airtableList(table) {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return { skipped: true, records: [] };
  }

  const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return response.json();
}

app.get("/api/wines", async (_req, res) => {
  try {
    const data = await airtableList("Wines");
    const records = (data.records || []).map((record) => ({
      id: record.id,
      name: record.fields?.Name || "",
      winery: record.fields?.Winery || "",
      vintage: record.fields?.Vintage || "",
      country: record.fields?.Country || "",
      source: record.fields?.Source || "",
      imageBase64: record.fields?.ImageBase64 || "",
    }));

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.get("/api/ratings", async (_req, res) => {
  try {
    const data = await airtableList("Ratings");
    const records = (data.records || []).map((record) => ({
      id: record.id,
      wineId: record.fields?.WineId || "",
      score: record.fields?.Score || null,
      notes: record.fields?.Notes || "",
    }));

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

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

  try {
    const [result] = await visionClient.textDetection(req.file.buffer);
    const text = result?.fullTextAnnotation?.text?.trim() || "";
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const vintageMatch = text.match(/\b(19|20)\d{2}\b/);
    const vintage = vintageMatch ? vintageMatch[0] : "";

    const countries = [
      "France",
      "Italy",
      "Spain",
      "Portugal",
      "United States",
      "USA",
      "Argentina",
      "Chile",
      "Australia",
      "New Zealand",
      "Germany",
      "Austria",
      "South Africa",
      "Greece",
    ];
    const countryMatch = countries.find((country) =>
      text.toLowerCase().includes(country.toLowerCase()),
    );
    const country = countryMatch === "USA" ? "United States" : countryMatch || "";

    res.json({
      name: lines[0] || "",
      winery: lines[1] || "",
      vintage,
      country,
      rawText: text,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/wines", async (req, res) => {
  try {
    const { name, winery, vintage, country, source, imageBase64 } = req.body;

    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const record = await airtableCreate("Wines", {
      SessionName: "Default Session",
      Name: name,
      Winery: winery || "",
      Vintage: vintage || "",
      Country: country || "",
      Source: source || "manual",
      ImageBase64: imageBase64 || "",
    });

    res.status(201).json({ ok: true, id: record?.id });
  } catch (error) {
    console.error("POST /api/wines failed:", error);
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/ratings", async (req, res) => {
  try {
    const { wineId, score, notes, participant } = req.body;

    if (!wineId) {
      res.status(400).json({ error: "wineId is required" });
      return;
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      res.status(400).json({ error: "score must be an integer from 1 to 5" });
      return;
    }

    await airtableCreate("Ratings", {
      SessionName: "Default Session",
      Participant: participant || "Guest",
      WineId: wineId,
      Score: score,
      Notes: notes || "",
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error("POST /api/ratings failed:", error);
    res.status(500).json({ error: String(error) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Taste That Wine backend listening on ${port}`);
});
