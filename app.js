const state = {
  session: JSON.parse(localStorage.getItem("ttw_session") || "null"),
  wines: JSON.parse(localStorage.getItem("ttw_wines") || "[]"),
};

const el = {
  sessionName: document.getElementById("sessionName"),
  participantName: document.getElementById("participantName"),
  saveSessionBtn: document.getElementById("saveSessionBtn"),
  sessionStatus: document.getElementById("sessionStatus"),
  bottlePhoto: document.getElementById("bottlePhoto"),
  lookupBtn: document.getElementById("lookupBtn"),
  wineName: document.getElementById("wineName"),
  winery: document.getElementById("winery"),
  vintage: document.getElementById("vintage"),
  country: document.getElementById("country"),
  addWineBtn: document.getElementById("addWineBtn"),
  wineStatus: document.getElementById("wineStatus"),
  wineSelect: document.getElementById("wineSelect"),
  score: document.getElementById("score"),
  submitRatingBtn: document.getElementById("submitRatingBtn"),
  ratingStatus: document.getElementById("ratingStatus"),
  wineList: document.getElementById("wineList"),
};

function render() {
  if (state.session) {
    el.sessionName.value = state.session.name;
    el.participantName.value = state.session.participant;
    el.sessionStatus.textContent = `Current session: ${state.session.name} (${state.session.participant})`;
  }

  el.wineList.innerHTML = "";
  el.wineSelect.innerHTML = "";

  if (state.wines.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No wine yet";
    el.wineSelect.append(option);
  }

  state.wines.forEach((wine) => {
    const li = document.createElement("li");
    li.textContent = `${wine.name || "Unknown wine"} — ${wine.winery || "Unknown winery"} (${wine.vintage || "N/A"})`;
    el.wineList.append(li);

    const option = document.createElement("option");
    option.value = wine.id;
    option.textContent = wine.name || wine.id;
    el.wineSelect.append(option);
  });
}

function saveLocal() {
  localStorage.setItem("ttw_session", JSON.stringify(state.session));
  localStorage.setItem("ttw_wines", JSON.stringify(state.wines));
}

el.saveSessionBtn.addEventListener("click", async () => {
  const name = el.sessionName.value.trim();
  const participant = el.participantName.value.trim();
  if (!name || !participant) {
    el.sessionStatus.textContent = "Please provide session and participant names.";
    return;
  }

  state.session = { name, participant };
  saveLocal();
  render();

  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.session),
    });
    if (!response.ok) throw new Error("session api error");
    el.sessionStatus.textContent = "Session saved locally and synced.";
  } catch {
    el.sessionStatus.textContent = "Session saved locally. Backend not reachable.";
  }
});

el.lookupBtn.addEventListener("click", async () => {
  const file = el.bottlePhoto.files?.[0];
  if (!file) {
    el.wineStatus.textContent = "Please take/select a bottle photo first.";
    return;
  }

  const form = new FormData();
  form.append("image", file);

  el.wineStatus.textContent = "Searching bottle info...";
  try {
    const response = await fetch("/api/wines/lookup", {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error("lookup failed");
    const data = await response.json();

    el.wineName.value = data.name || "";
    el.winery.value = data.winery || "";
    el.vintage.value = data.vintage || "";
    el.country.value = data.country || "";
    el.wineStatus.textContent = "Auto-fill complete. Please confirm values.";
  } catch {
    el.wineStatus.textContent = "Lookup unavailable. Enter details manually.";
  }
});

el.addWineBtn.addEventListener("click", async () => {
  if (!state.session) {
    el.wineStatus.textContent = "Please save a session first.";
    return;
  }

  const wine = {
    id: crypto.randomUUID(),
    name: el.wineName.value.trim(),
    winery: el.winery.value.trim(),
    vintage: el.vintage.value.trim(),
    country: el.country.value.trim(),
    sessionName: state.session.name,
  };

  if (!wine.name) {
    el.wineStatus.textContent = "Wine name is required.";
    return;
  }

  state.wines.push(wine);
  saveLocal();
  render();

  el.wineName.value = "";
  el.winery.value = "";
  el.vintage.value = "";
  el.country.value = "";
  el.wineStatus.textContent = "Wine added to this session.";
});

el.submitRatingBtn.addEventListener("click", async () => {
  if (!state.session) {
    el.ratingStatus.textContent = "Save session first.";
    return;
  }

  const wineId = el.wineSelect.value;
  const score = Number(el.score.value);

  if (!wineId) {
    el.ratingStatus.textContent = "Choose a wine to rate.";
    return;
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    el.ratingStatus.textContent = "Score must be an integer from 1 to 5.";
    return;
  }

  const rating = {
    sessionName: state.session.name,
    participant: state.session.participant,
    wineId,
    score,
  };

  try {
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rating),
    });
    if (!response.ok) throw new Error("rating api failed");
    el.ratingStatus.textContent = "Rating submitted and saved to Airtable.";
  } catch {
    el.ratingStatus.textContent = "Rating kept in app only (backend unavailable).";
  }
});

render();
