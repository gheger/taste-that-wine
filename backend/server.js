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
let visionClient = null;

function hasVisionCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GOOGLE_API_KEY,
  );
}

if (!process.env.GOOGLE_CLOUD_DISABLE_GCE_METADATA && !hasVisionCredentials()) {
  process.env.GOOGLE_CLOUD_DISABLE_GCE_METADATA = "true";
}

function getVisionClient() {
  if (!visionClient) {
    visionClient = new vision.ImageAnnotatorClient();
  }
  return visionClient;
}
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.static(projectRoot));

app.get("/", (_req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

function escapeAirtableValue(value) {
  return String(value || "").replace(/'/g, "\\'");
}

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

async function airtableUpdate(table, recordId, fields) {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return { skipped: true };
  }

  const response = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return response.json();
}

async function airtableList(table, options = {}) {
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return { skipped: true, records: [] };
  }

  const params = new URLSearchParams();
  if (options.filterByFormula) {
    params.set("filterByFormula", options.filterByFormula);
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url, {
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

app.get("/api/wines", async (req, res) => {
  try {
    const sessionName = String(req.query.session || "").trim();
    if (!sessionName) {
      res.status(400).json({ error: "session is required" });
      return;
    }

    const data = await airtableList("Wines", {
      filterByFormula: `TRIM({SessionName})='${escapeAirtableValue(sessionName)}'`,
    });
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

app.get("/api/ratings", async (req, res) => {
  try {
    const sessionName = String(req.query.session || "").trim();
    if (!sessionName) {
      res.status(400).json({ error: "session is required" });
      return;
    }

    const data = await airtableList("Ratings", {
      filterByFormula: `TRIM({SessionName})='${escapeAirtableValue(sessionName)}'`,
    });
    const records = (data.records || []).map((record) => ({
      id: record.id,
      wineId: record.fields?.WineId || "",
      score: record.fields?.Score || null,
      notes: record.fields?.Notes || "",
      participant: record.fields?.Participant || "",
    }));

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

function generateSessionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function findSessionByCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  const data = await airtableList("Sessions", {
    filterByFormula: `UPPER(TRIM({Code}))='${escapeAirtableValue(normalized)}'`,
  });
  if (data.records?.length) {
    return data.records[0];
  }

  const fallback = await airtableList("Sessions");
  const match = (fallback.records || []).find((record) => {
    const codeValue = String(record.fields?.Code || "").trim().toUpperCase();
    return codeValue === normalized;
  });
  return match || null;
}

async function findRatingRecord({ sessionName, wineId, participant }) {
  const formula = `AND({SessionName}='${escapeAirtableValue(sessionName)}', {WineId}='${escapeAirtableValue(wineId)}', {Participant}='${escapeAirtableValue(participant)}')`;
  const data = await airtableList("Ratings", {
    filterByFormula: formula,
  });
  return data.records?.[0] || null;
}

app.post("/api/sessions", async (req, res) => {
  try {
    const { name, participant } = req.body;
    if (!name || !participant) {
      res.status(400).json({ error: "name and participant are required" });
      return;
    }

    let code = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateSessionCode();
      const existing = await findSessionByCode(candidate);
      if (!existing) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      res.status(500).json({ error: "Could not generate session code" });
      return;
    }

    await airtableCreate("Sessions", {
      Name: name,
      Host: participant,
      Code: code,
      Status: "active",
      Date: new Date().toISOString(),
    });

    res.status(201).json({ ok: true, code, name });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.post("/api/sessions/join", async (req, res) => {
  try {
    const { code, participant } = req.body;
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode || !participant) {
      res.status(400).json({ error: "code and participant are required" });
      return;
    }

    const record = await findSessionByCode(normalizedCode);
    if (!record) {
      res.status(404).json({ error: "session not found" });
      return;
    }

    const status = String(record.fields?.Status || "active").toLowerCase().trim();
    if (status && status !== "active") {
      res.status(410).json({ error: "session is not active" });
      return;
    }

    res.json({
      ok: true,
      code: normalizedCode,
      name: String(record.fields?.Name || "").trim(),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
app.post("/api/wines/lookup", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "image is required" });
    return;
  }

  if (!hasVisionCredentials()) {
    res.status(503).json({ error: "Vision lookup not configured" });
    return;
  }

  try {
    const client = getVisionClient();
    const [result] = await client.textDetection(req.file.buffer);
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
    const { name, winery, vintage, country, source, imageBase64, sessionName } = req.body;
    const normalizedSession = String(sessionName || "").trim();

    if (!name || !normalizedSession) {
      res.status(400).json({ error: "name and sessionName are required" });
      return;
    }

    const record = await airtableCreate("Wines", {
      SessionName: normalizedSession,
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
    const { wineId, score, notes, participant, sessionName } = req.body;
    const participantName = String(participant || "").trim();
    const normalizedSession = String(sessionName || "").trim();

    if (!wineId || !normalizedSession || !participantName) {
      res
        .status(400)
        .json({ error: "wineId, sessionName, and participant are required" });
      return;
    }

    if (!Number.isInteger(score) || score < 1 || score > 100) {
      res.status(400).json({ error: "score must be an integer from 1 to 100" });
      return;
    }

    const existing = await findRatingRecord({
      sessionName: normalizedSession,
      wineId,
      participant: participantName,
    });

    if (existing?.id) {
      await airtableUpdate("Ratings", existing.id, {
        Score: score,
        Notes: notes || "",
      });
      res.status(200).json({ ok: true, updated: true, id: existing.id });
      return;
    }

    await airtableCreate("Ratings", {
      SessionName: normalizedSession,
      Participant: participantName,
      WineId: wineId,
      Score: score,
      Notes: notes || "",
    });

    res.status(201).json({ ok: true, updated: false });
  } catch (error) {
    console.error("POST /api/ratings failed:", error);
    res.status(500).json({ error: String(error) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Taste That Wine backend listening on ${port}`);
});
