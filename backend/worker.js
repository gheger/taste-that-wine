const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function escapeAirtableValue(value) {
  return String(value || "").replace(/'/g, "\\'");
}

function hasAirtable(env) {
  return Boolean(env.AIRTABLE_BASE_ID && env.AIRTABLE_TOKEN);
}

async function airtableList(env, table, options = {}) {
  if (!hasAirtable(env)) {
    throw new Error("Airtable not configured");
  }

  const params = new URLSearchParams();
  if (options.filterByFormula) {
    params.set("filterByFormula", options.filterByFormula);
  }
  if (options.maxRecords) {
    params.set("maxRecords", String(options.maxRecords));
  }

  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return response.json();
}

async function airtableCreate(env, table, fields) {
  if (!hasAirtable(env)) {
    throw new Error("Airtable not configured");
  }

  const response = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
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

async function airtableUpdate(env, table, recordId, fields) {
  if (!hasAirtable(env)) {
    throw new Error("Airtable not configured");
  }

  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
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

async function findSessionByCode(env, code) {
  const normalized = String(code || "").trim().toUpperCase();
  const data = await airtableList(env, "Sessions", {
    filterByFormula: `UPPER(TRIM({Code}))='${escapeAirtableValue(normalized)}'`,
  });

  if (data.records?.length) {
    return data.records[0];
  }

  const fallback = await airtableList(env, "Sessions");
  const match = (fallback.records || []).find((record) => {
    const codeValue = String(record.fields?.Code || "").trim().toUpperCase();
    return codeValue === normalized;
  });
  return match || null;
}

async function findRatingRecord(env, { sessionName, wineId, participant }) {
  const formula = `AND({SessionName}='${escapeAirtableValue(
    sessionName,
  )}', {WineId}='${escapeAirtableValue(wineId)}', {Participant}='${escapeAirtableValue(
    participant,
  )}')`;
  const data = await airtableList(env, "Ratings", { filterByFormula: formula, maxRecords: 1 });
  return data.records?.[0] || null;
}

async function hasParticipantInSession(env, { sessionName, participant }) {
  const normalizedSession = String(sessionName || "").trim();
  const normalizedParticipant = String(participant || "").trim().toLowerCase();
  if (!normalizedSession || !normalizedParticipant) return false;

  const formula = `AND(TRIM({SessionName})='${escapeAirtableValue(
    normalizedSession,
  )}', LOWER(TRIM({Participant}))='${escapeAirtableValue(normalizedParticipant)}')`;
  const data = await airtableList(env, "Ratings", { filterByFormula: formula, maxRecords: 1 });
  return Boolean(data.records?.length);
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (request.method === "GET" && pathname === "/api/wines") {
        const sessionName = String(url.searchParams.get("session") || "").trim();
        if (!sessionName) return jsonResponse({ error: "session is required" }, 400);

        const data = await airtableList(env, "Wines", {
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
        return jsonResponse({ records });
      }

      if (request.method === "GET" && pathname === "/api/ratings") {
        const sessionName = String(url.searchParams.get("session") || "").trim();
        if (!sessionName) return jsonResponse({ error: "session is required" }, 400);

        const data = await airtableList(env, "Ratings", {
          filterByFormula: `TRIM({SessionName})='${escapeAirtableValue(sessionName)}'`,
        });
        const records = (data.records || []).map((record) => ({
          id: record.id,
          wineId: record.fields?.WineId || "",
          score: record.fields?.Score || null,
          notes: record.fields?.Notes || "",
          participant: record.fields?.Participant || "",
        }));
        return jsonResponse({ records });
      }

      if (request.method === "POST" && pathname === "/api/sessions/join") {
        const body = await parseJson(request);
        const code = String(body?.code || "").trim().toUpperCase();
        const participant = String(body?.participant || "").trim();
        if (!code || !participant) {
          return jsonResponse({ error: "code and participant are required" }, 400);
        }

        const record = await findSessionByCode(env, code);
        if (!record) return jsonResponse({ error: "session not found" }, 404);

        const status = String(record.fields?.Status || "active").toLowerCase().trim();
        if (status && status !== "active") {
          return jsonResponse({ error: "session is not active" }, 410);
        }

        const sessionName = String(record.fields?.Name || "").trim();
        const participantExists = await hasParticipantInSession(env, {
          sessionName,
          participant,
        });

        return jsonResponse({
          ok: true,
          code,
          name: sessionName,
          participantExists,
        });
      }

      if (request.method === "POST" && pathname === "/api/wines") {
        const body = await parseJson(request);
        const name = String(body?.name || "").trim();
        const sessionName = String(body?.sessionName || "").trim();

        if (!name || !sessionName) {
          return jsonResponse({ error: "name and sessionName are required" }, 400);
        }

        const record = await airtableCreate(env, "Wines", {
          SessionName: sessionName,
          Name: name,
          Winery: body?.winery || "",
          Vintage: body?.vintage || "",
          Country: body?.country || "",
          Source: body?.source || "manual",
          ImageBase64: body?.imageBase64 || "",
        });

        return jsonResponse({ ok: true, id: record?.id }, 201);
      }

      if (request.method === "POST" && pathname === "/api/ratings") {
        const body = await parseJson(request);
        const wineId = String(body?.wineId || "").trim();
        const sessionName = String(body?.sessionName || "").trim();
        const participant = String(body?.participant || "").trim();
        const score = Number(body?.score);

        if (!wineId || !sessionName || !participant) {
          return jsonResponse(
            { error: "wineId, sessionName, and participant are required" },
            400,
          );
        }

        if (!Number.isInteger(score) || score < 0 || score > 100) {
          return jsonResponse({ error: "score must be an integer from 0 to 100" }, 400);
        }

        const existing = await findRatingRecord(env, {
          sessionName,
          wineId,
          participant,
        });

        if (existing?.id) {
          await airtableUpdate(env, "Ratings", existing.id, {
            Score: score,
            Notes: body?.notes || "",
          });
          return jsonResponse({ ok: true, updated: true, id: existing.id }, 200);
        }

        await airtableCreate(env, "Ratings", {
          SessionName: sessionName,
          Participant: participant,
          WineId: wineId,
          Score: score,
          Notes: body?.notes || "",
        });

        return jsonResponse({ ok: true, updated: false }, 201);
      }

      if (request.method === "POST" && pathname === "/api/wines/lookup") {
        return jsonResponse({ error: "Vision lookup not configured" }, 503);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      return jsonResponse({ error: String(error) }, 500);
    }
  },
};
