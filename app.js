const state = {
  wines: [],
  ratings: [],
  selectedWineId: "",
  sessionName: "",
  sessionCode: "",
  participantName: "",
  favorites: new Set(),
};

const API_BASE = window.API_BASE || "";

const normalizeCountry = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeParticipantName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const countryFlags = {
  france: "🇫🇷",
  italie: "🇮🇹",
  italy: "🇮🇹",
  espagne: "🇪🇸",
  spain: "🇪🇸",
  portugal: "🇵🇹",
  suisse: "🇨🇭",
  switzerland: "🇨🇭",
  "etats-unis": "🇺🇸",
  "etats unis": "🇺🇸",
  "etatsunis": "🇺🇸",
  "etats-unis d'amerique": "🇺🇸",
  "etats-unis d amerique": "🇺🇸",
  "etats unis d amerique": "🇺🇸",
  "united states": "🇺🇸",
  usa: "🇺🇸",
  argentine: "🇦🇷",
  argentina: "🇦🇷",
  chili: "🇨🇱",
  chile: "🇨🇱",
  australie: "🇦🇺",
  australia: "🇦🇺",
  "nouvelle-zelande": "🇳🇿",
  "nouvelle zelande": "🇳🇿",
  "new zealand": "🇳🇿",
  allemagne: "🇩🇪",
  germany: "🇩🇪",
  autriche: "🇦🇹",
  austria: "🇦🇹",
  "afrique du sud": "🇿🇦",
  "south africa": "🇿🇦",
  grece: "🇬🇷",
  greece: "🇬🇷",
};

const el = {
  menuToggle: document.getElementById("menuToggle"),
  drawer: document.getElementById("drawer"),
  navLinks: document.querySelectorAll("[data-nav]"),
  sections: document.querySelectorAll("[data-section]"),
  bottlePhoto: document.getElementById("bottlePhoto"),
  lookupBtn: document.getElementById("lookupBtn"),
  wineName: document.getElementById("wineName"),
  winery: document.getElementById("winery"),
  vintage: document.getElementById("vintage"),
  country: document.getElementById("country"),
  addWineBtn: document.getElementById("addWineBtn"),
  wineStatus: document.getElementById("wineStatus"),
  score: document.getElementById("score"),
  scoreValue: document.getElementById("scoreValue"),
  scoreLabel: document.getElementById("scoreLabel"),
  averageScore: document.getElementById("averageScore"),
  notes: document.getElementById("notes"),
  notesCount: document.getElementById("notesCount"),
  submitRatingBtn: document.getElementById("submitRatingBtn"),
  ratingStatus: document.getElementById("ratingStatus"),
  wineTableBody: document.getElementById("wineTableBody"),
  selectedWineImage: document.getElementById("selectedWineImage"),
  selectedWineInfo: document.getElementById("selectedWineInfo"),
  selectedWineName: document.getElementById("selectedWineName"),
  selectedWineWinery: document.getElementById("selectedWineWinery"),
  selectedWineVintage: document.getElementById("selectedWineVintage"),
  selectedWineCountry: document.getElementById("selectedWineCountry"),
  selectedWineVivinoLink: document.getElementById("selectedWineVivinoLink"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  participantName: document.getElementById("participantName"),
  sessionCode: document.getElementById("sessionCode"),
  joinSessionBtn: document.getElementById("joinSessionBtn"),
  sessionStatus: document.getElementById("sessionStatus"),
  activeSession: document.getElementById("activeSession"),
  sessionCard: document.getElementById("sessionCard"),
  notesCard: document.getElementById("notesCard"),
  imageLightbox: document.getElementById("imageLightbox"),
  lightboxImage: document.getElementById("lightboxImage"),
  lightboxClose: document.getElementById("lightboxClose"),
  resetSessionBtn: document.getElementById("resetSessionBtn"),
  toLeaderboardBtn: document.getElementById("toLeaderboardBtn"),
  refreshLeaderboardBtn: document.getElementById("refreshLeaderboardBtn"),
  leaderboardBody: document.getElementById("leaderboardBody"),
  leaderboardStatus: document.getElementById("leaderboardStatus"),
  favoritesBody: document.getElementById("favoritesBody"),
  favoritesStatus: document.getElementById("favoritesStatus"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  leaderboardModalClose: document.getElementById("leaderboardModalClose"),
  modalWineName: document.getElementById("modalWineName"),
  modalWineWinery: document.getElementById("modalWineWinery"),
  modalWineVintage: document.getElementById("modalWineVintage"),
  modalWineCountry: document.getElementById("modalWineCountry"),
  modalWineAverage: document.getElementById("modalWineAverage"),
  modalWineVotes: document.getElementById("modalWineVotes"),
  modalWineImage: document.getElementById("modalWineImage"),
  modalOpenNotesBtn: document.getElementById("modalOpenNotesBtn"),
  modalVivinoLink: document.getElementById("modalVivinoLink"),
  modalNotesList: document.getElementById("modalNotesList"),
  joinNameConflictModal: document.getElementById("joinNameConflictModal"),
  joinNameConflictConfirmBtn: document.getElementById("joinNameConflictConfirmBtn"),
  joinNameConflictCancelBtn: document.getElementById("joinNameConflictCancelBtn"),
};

function updateSelectedWineImage() {
  const wine = state.wines.find((item) => item.id === state.selectedWineId);
  if (wine && wine.imageBase64) {
    el.selectedWineImage.src = wine.imageBase64;
    el.selectedWineImage.style.display = "block";
  } else {
    el.selectedWineImage.removeAttribute("src");
    el.selectedWineImage.style.display = "none";
  }

  if (el.selectedWineInfo) {
    el.selectedWineInfo.classList.toggle("is-hidden", !wine);
  }

  if (wine) {
    if (el.selectedWineName) {
      el.selectedWineName.textContent = wine.name || "Vin inconnu";
    }
    if (el.selectedWineWinery) {
      el.selectedWineWinery.textContent = wine.winery
        ? `Domaine : ${wine.winery}`
        : "Domaine : N/D";
    }
    if (el.selectedWineVintage) {
      el.selectedWineVintage.textContent = wine.vintage
        ? `Millésime : ${wine.vintage}`
        : "Millésime : N/D";
    }
    if (el.selectedWineCountry) {
      const country = wine.country || "";
      const flag = countryFlags[normalizeCountry(country)] || "";
      if (flag && country) {
        el.selectedWineCountry.textContent = `Pays : ${flag} ${country}`;
      } else if (flag) {
        el.selectedWineCountry.textContent = `Pays : ${flag}`;
      } else if (country) {
        el.selectedWineCountry.textContent = `Pays : ${country}`;
      } else {
        el.selectedWineCountry.textContent = "Pays : N/D";
      }
    }
    if (el.selectedWineVivinoLink) {
      const query = `${wine.name || ""} ${wine.winery || ""}`.trim();
      el.selectedWineVivinoLink.href = query
        ? `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`
        : "#";
    }
    if (el.favoriteBtn) {
      el.favoriteBtn.dataset.wineId = wine.id;
      el.favoriteBtn.classList.toggle("is-active", state.favorites.has(wine.id));
      const heart = el.favoriteBtn.querySelector(".heart-icon");
      if (heart) {
        heart.textContent = state.favorites.has(wine.id) ? "♥" : "♡";
      }
    }
  } else {
    if (el.selectedWineName) el.selectedWineName.textContent = "";
    if (el.selectedWineWinery) el.selectedWineWinery.textContent = "";
    if (el.selectedWineVintage) el.selectedWineVintage.textContent = "";
    if (el.selectedWineCountry) el.selectedWineCountry.textContent = "";
    if (el.selectedWineVivinoLink) el.selectedWineVivinoLink.href = "#";
    if (el.favoriteBtn) {
      el.favoriteBtn.dataset.wineId = "";
      el.favoriteBtn.classList.remove("is-active");
      const heart = el.favoriteBtn.querySelector(".heart-icon");
      if (heart) {
        heart.textContent = "♡";
      }
    }
  }
}

function openLightbox(src) {
  if (!src || !el.imageLightbox || !el.lightboxImage) return;
  el.lightboxImage.src = src;
  el.imageLightbox.classList.add("is-open");
  el.imageLightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  if (!el.imageLightbox || !el.lightboxImage) return;
  el.imageLightbox.classList.remove("is-open");
  el.imageLightbox.setAttribute("aria-hidden", "true");
  el.lightboxImage.removeAttribute("src");
}

function setActiveSection(section) {
  el.sections.forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  el.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === section);
  });
  document.body.classList.remove("drawer-open");
  if (section === "notes") {
    requestAnimationFrame(() => {
      updateScoreDisplay();
    });
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function compressImageToDataUrl(file, options = {}) {
  const maxDimension = options.maxDimension || 1024;
  const quality = options.quality || 0.7;
  const originalDataUrl = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > width && height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(originalDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => reject(new Error("Impossible de charger l'image pour la compression."));
    img.src = originalDataUrl;
  });
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

async function readErrorMessage(response, fallback) {
  try {
    const payload = await response.json();
    if (payload?.error) return payload.error;
  } catch {
    // ignore
  }
  return fallback;
}

function getNoteForWine(wineId) {
  const participantName = String(state.participantName || "").trim();
  const note = state.ratings.find(
    (rating) =>
      rating.wineId === wineId &&
      String(rating.notes || "").trim() &&
      String(rating.participant || "").trim() === participantName,
  );
  return note ? note.notes : "";
}

function updateNotesCount() {
  if (!el.notesCount) return;
  const length = el.notes.value.length;
  el.notesCount.textContent = `${length} / 200`;
}

function getScoreForWine(wineId) {
  const participantName = String(state.participantName || "").trim();
  const rating = state.ratings.find(
    (item) =>
      item.wineId === wineId &&
      Number.isFinite(Number(item.score)) &&
      String(item.participant || "").trim() === participantName,
  );
  return rating ? Number(rating.score) : null;
}

function updateAverageScore() {
  if (!el.averageScore) return;
  if (!state.selectedWineId) {
    el.averageScore.textContent = "Moyenne : --";
    return;
  }

  const scores = state.ratings
    .filter((rating) => rating.wineId === state.selectedWineId)
    .map((rating) => Number(rating.score))
    .filter((value) => Number.isFinite(value));

  if (scores.length === 0) {
    el.averageScore.textContent = "Moyenne : --";
    return;
  }

  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const rounded = Math.round(avg);
  el.averageScore.textContent = `Moyenne : ${rounded}`;
}

function truncateNote(text, limit = 200) {
  const value = String(text || "");
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}…`;
}

const scoreLabels = {
  0: "No way",
  10: "Bon à se laver les pieds",
  20: "Pour une sauce, allez",
  30: "Digne des meilleures gorons",
  40: "Correct sans plus",
  50: "Ça joue",
  60: "Bon",
  70: "Très bon",
  80: "Excellent",
  90: "Exceptionnel",
  100: "Le meilleur vin du monde",
};

function normalizeScore(value) {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 50;
  const clamped = Math.min(100, Math.max(0, safe));
  return Math.round(clamped / 10) * 10;
}

let autoSaveTimer = null;
let lastSavedKey = "";
function getRatingKey() {
  if (!state.selectedWineId || !state.participantName || !state.sessionName) return "";
  const score = normalizeScore(el.score.value);
  const notes = el.notes.value.trim();
  return `${state.sessionName}::${state.participantName}::${state.selectedWineId}::${score}::${notes}`;
}

async function saveRating() {
  const wineId = state.selectedWineId;
  const score = Number(el.score.value);

  if (!state.sessionName) {
    el.ratingStatus.textContent = "Créez ou rejoignez une session d’abord.";
    return;
  }

  if (!state.participantName) {
    el.ratingStatus.textContent = "Veuillez saisir votre prénom.";
    return;
  }

  if (!wineId) {
    el.ratingStatus.textContent = "Choisissez un vin à noter.";
    return;
  }

  if (!Number.isInteger(score) || score < 0 || score > 100) {
    el.ratingStatus.textContent = "La note doit être un entier de 0 à 100.";
    return;
  }

  const rating = {
    wineId,
    score,
    notes: el.notes.value.trim(),
    participant: state.participantName,
    sessionName: state.sessionName,
  };

  try {
    el.ratingStatus.textContent = "Enregistrement...";
    const response = await fetch(`${API_BASE}/api/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rating),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Échec de l’enregistrement des notes de dégustation.");
      throw new Error(message);
    }
    el.ratingStatus.textContent = "Notes de dégustation enregistrées.";
    await loadRatings();
  } catch (error) {
    el.ratingStatus.textContent = `Échec des notes de dégustation. ${error.message}`;
  }
}

function scheduleAutoSave(delay = 1200) {
  const key = getRatingKey();
  if (!key || key === lastSavedKey) return;

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(async () => {
    const nextKey = getRatingKey();
    if (!nextKey || nextKey === lastSavedKey) return;
    el.ratingStatus.textContent = "Enregistrement...";
    await saveRating();
    lastSavedKey = nextKey;
  }, delay);
}

function setSelectedWine(wineId) {
  state.selectedWineId = wineId;
  render();
  el.notes.value = wineId ? getNoteForWine(wineId) : "";
  updateNotesCount();
  const existingScore = wineId ? getScoreForWine(wineId) : null;
  const nextScore = Number.isFinite(existingScore) ? normalizeScore(existingScore) : 50;
  el.score.value = String(nextScore);
  updateScoreDisplay();
  updateSelectedWineImage();
  updateAverageScore();
  document.querySelectorAll(".wine-table tbody tr").forEach((tr) => {
    tr.classList.toggle("active", tr.dataset.wineId === wineId);
  });
  if (el.notesCard) {
    el.notesCard.classList.toggle("is-hidden", !wineId);
  }
}

function setSessionInfo({ name, code, participant }) {
  state.sessionName = String(name || "").trim();
  state.sessionCode = code || "";
  state.participantName = participant || "";
  localStorage.setItem("ttw_sessionName", state.sessionName);
  localStorage.setItem("ttw_sessionCode", state.sessionCode);
  localStorage.setItem("ttw_participantName", state.participantName);
  el.sessionCode.value = state.sessionCode;
  el.participantName.value = state.participantName;
  el.activeSession.textContent = state.sessionName
    ? `Session en cours : ${state.sessionName} (code ${state.sessionCode})`
    : "";
  if (el.sessionCard) {
    el.sessionCard.classList.toggle("is-hidden", Boolean(state.sessionName));
  }
}

function openLeaderboardModal(entry) {
  if (!el.leaderboardModal) return;
  if (el.modalOpenNotesBtn) {
    el.modalOpenNotesBtn.dataset.wineId = entry.id;
  }
  if (el.modalVivinoLink) {
    const query = `${entry.name || ""} ${entry.winery || ""}`.trim();
    el.modalVivinoLink.href = query
      ? `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`
      : "#";
  }
  el.modalWineName.textContent = entry.name || "Vin inconnu";
  el.modalWineWinery.textContent = entry.winery ? `Domaine : ${entry.winery}` : "Domaine : N/D";
  el.modalWineVintage.textContent = entry.vintage
    ? `Millésime : ${entry.vintage}`
    : "Millésime : N/D";
  el.modalWineCountry.textContent = entry.country ? `Pays : ${entry.country}` : "Pays : N/D";
  el.modalWineAverage.textContent =
    entry.avg !== null ? `Moyenne : ${entry.avg}` : "Moyenne : —";
  el.modalWineVotes.textContent = `Votes : ${entry.votes}`;

  if (entry.imageBase64) {
    el.modalWineImage.src = entry.imageBase64;
    el.modalWineImage.style.display = "block";
  } else {
    el.modalWineImage.removeAttribute("src");
    el.modalWineImage.style.display = "none";
  }

  if (el.modalNotesList) {
    const notes = state.ratings
      .filter(
        (rating) =>
          rating.wineId === entry.id && String(rating.notes || "").trim().length > 0,
      )
      .map((rating) => ({
        author: String(rating.participant || "Anonyme").trim(),
        text: truncateNote(String(rating.notes || "").trim(), 200),
        score: Number.isFinite(Number(rating.score)) ? Number(rating.score) : null,
      }));

    if (notes.length === 0) {
      el.modalNotesList.innerHTML = `<p class="selected-wine-detail">Aucune note pour l’instant.</p>`;
    } else {
      el.modalNotesList.innerHTML = notes
        .map(
          (note) => `
            <div class="note-quote">
              ${note.score !== null ? `(${note.score}) ` : ""}${note.text}
              <p class="note-author">— ${note.author}</p>
            </div>
          `,
        )
        .join("");
    }
  }

  el.leaderboardModal.classList.add("is-open");
  el.leaderboardModal.setAttribute("aria-hidden", "false");
}

function closeLeaderboardModal() {
  if (!el.leaderboardModal) return;
  el.leaderboardModal.classList.remove("is-open");
  el.leaderboardModal.setAttribute("aria-hidden", "true");
}

let joinConflictResolver = null;

function resolveJoinConflict(choice) {
  if (!el.joinNameConflictModal) return;
  el.joinNameConflictModal.classList.remove("is-open");
  el.joinNameConflictModal.setAttribute("aria-hidden", "true");
  if (joinConflictResolver) {
    joinConflictResolver(choice);
    joinConflictResolver = null;
  }
}

function openJoinConflictModal() {
  if (
    !el.joinNameConflictModal ||
    !el.joinNameConflictConfirmBtn ||
    !el.joinNameConflictCancelBtn
  ) {
    return Promise.resolve(
      window.confirm(
        "Il existe déjà un participant avec ce nom.\n\nOK: Oui, c'est moi, rejoindre la session\nAnnuler: Je vais choisi un autre prénom",
      ),
    );
  }

  el.joinNameConflictModal.classList.add("is-open");
  el.joinNameConflictModal.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => {
    joinConflictResolver = resolve;
  });
}

async function participantNameExistsInSession(sessionName, participant) {
  const normalizedName = normalizeParticipantName(participant);
  if (!sessionName || !normalizedName) return false;

  try {
    const response = await fetch(
      `${API_BASE}/api/ratings?session=${encodeURIComponent(sessionName)}`,
    );
    if (!response.ok) return false;
    const data = await response.json();
    const records = Array.isArray(data.records) ? data.records : [];
    return records.some(
      (rating) => normalizeParticipantName(rating.participant) === normalizedName,
    );
  } catch {
    return false;
  }
}

function participantNameExistsInRatings(participant) {
  const normalizedName = normalizeParticipantName(participant);
  if (!normalizedName) return false;
  return state.ratings.some(
    (rating) => normalizeParticipantName(rating.participant) === normalizedName,
  );
}

function clearSessionInfo() {
  state.sessionName = "";
  state.sessionCode = "";
  state.participantName = "";
  localStorage.removeItem("ttw_sessionName");
  localStorage.removeItem("ttw_sessionCode");
  localStorage.removeItem("ttw_participantName");
  el.activeSession.textContent = "";
  if (el.sessionCard) {
    el.sessionCard.classList.remove("is-hidden");
  }
  state.selectedWineId = "";
  el.notes.value = "";
  el.score.value = "50";
  updateScoreDisplay();
  updateSelectedWineImage();
  render();
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem("ttw_favorites");
    const list = raw ? JSON.parse(raw) : [];
    state.favorites = new Set(Array.isArray(list) ? list : []);
  } catch {
    state.favorites = new Set();
  }
}

function saveFavorites() {
  localStorage.setItem("ttw_favorites", JSON.stringify(Array.from(state.favorites)));
}

function buildLeaderboardRows() {
  if (!el.leaderboardBody) return;
  el.leaderboardBody.innerHTML = "";

  const ratingsByWine = new Map();
  state.ratings.forEach((rating) => {
    if (!rating.wineId) return;
    const score = Number(rating.score);
    if (!Number.isFinite(score)) return;
    const list = ratingsByWine.get(rating.wineId) || [];
    list.push(score);
    ratingsByWine.set(rating.wineId, list);
  });

  const rows = state.wines.map((wine) => {
    const scores = ratingsByWine.get(wine.id) || [];
    const avg = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;
    return {
      id: wine.id,
      name: wine.name || "Vin inconnu",
      winery: wine.winery || "Domaine inconnu",
      vintage: wine.vintage || "",
      country: wine.country || "",
      imageBase64: wine.imageBase64 || "",
      avg,
      votes: scores.length,
    };
  });

  rows.sort((a, b) => {
    if (a.avg === null && b.avg === null) return a.name.localeCompare(b.name);
    if (a.avg === null) return 1;
    if (b.avg === null) return -1;
    if (b.avg !== a.avg) return b.avg - a.avg;
    return b.votes - a.votes;
  });

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.wineId = row.id;
    tr.innerHTML = `
      <td class="wine-cell"><span>${row.name}</span></td>
      <td>${row.winery}</td>
      <td>${row.avg ?? "—"}</td>
      <td>${row.votes}</td>
      <td>${state.favorites.has(row.id) ? "1" : "0"}</td>
    `;
    tr.addEventListener("click", () => openLeaderboardModal(row));
    el.leaderboardBody.append(tr);
  });
}

function buildFavoritesRows() {
  if (!el.favoritesBody) return;
  el.favoritesBody.innerHTML = "";

  const favorites = state.wines.filter((wine) => state.favorites.has(wine.id));
  if (favorites.length === 0) {
    if (el.favoritesStatus) {
      el.favoritesStatus.textContent = "Aucun favori pour l’instant.";
    }
    return;
  }

  if (el.favoritesStatus) {
    el.favoritesStatus.textContent = "";
  }

  favorites.forEach((wine) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="wine-cell"><span>${wine.name || "Vin inconnu"}</span></td>
      <td>${wine.winery || "Domaine inconnu"}</td>
      <td>${wine.vintage || "N/D"}</td>
    `;
    tr.addEventListener("click", () => {
      setSelectedWine(wine.id);
      setActiveSection("notes");
    });
    el.favoritesBody.append(tr);
  });
}

function render() {
  el.wineTableBody.innerHTML = "";
  const participantName = String(state.participantName || "").trim();
  const tastedSet = new Set(
    state.ratings
      .filter(
        (rating) =>
          rating.wineId && String(rating.participant || "").trim() === participantName,
      )
      .map((rating) => rating.wineId)
      .filter(Boolean),
  );

  state.wines.forEach((wine) => {
    const row = document.createElement("tr");
    row.dataset.wineId = wine.id;
    const rowTasted = tastedSet.has(wine.id);
    const rowMark = rowTasted ? "✓" : "?";
    const country = wine.country || "";
    const flag = countryFlags[normalizeCountry(country)] || "";
    const countryCell = flag ? `<span class="country-flag" title="${country}">${flag}</span>` : "N/D";
    row.classList.toggle("tasted", rowTasted);
    row.classList.toggle("untasted", !rowTasted);
    row.innerHTML = `
      <td class="wine-cell"><span>${wine.name || "Vin inconnu"}</span></td>
      <td>${wine.winery || "Domaine inconnu"}</td>
      <td>${wine.vintage || "N/D"}</td>
      <td>${countryCell}</td>
      <td class="taste-mark">${rowMark}</td>
    `;
    row.addEventListener("click", () => {
      setSelectedWine(wine.id);
      setActiveSection("notes");
    });
    el.wineTableBody.append(row);
  });

  if (el.notesCard) {
    el.notesCard.classList.toggle("is-hidden", !state.selectedWineId);
  }
}

async function loadWines() {
  try {
    if (!state.sessionName) {
      state.wines = [];
      render();
      return;
    }

    const response = await fetch(
      `${API_BASE}/api/wines?session=${encodeURIComponent(state.sessionName)}`,
    );
    if (!response.ok) throw new Error("wines api failed");
    const data = await response.json();
    state.wines = Array.isArray(data.records) ? data.records : [];
  } catch {
    state.wines = [];
  }
  render();
  buildLeaderboardRows();
  buildFavoritesRows();
}

async function loadRatings() {
  try {
    if (!state.sessionName) {
      state.ratings = [];
      render();
      return;
    }

    const response = await fetch(
      `${API_BASE}/api/ratings?session=${encodeURIComponent(state.sessionName)}`,
    );
    if (!response.ok) throw new Error("ratings api failed");
    const data = await response.json();
    state.ratings = Array.isArray(data.records) ? data.records : [];
  } catch {
    state.ratings = [];
  }
  render();
  if (state.selectedWineId) {
    el.notes.value = getNoteForWine(state.selectedWineId);
    updateNotesCount();
    const existingScore = getScoreForWine(state.selectedWineId);
    const nextScore = Number.isFinite(existingScore) ? normalizeScore(existingScore) : 50;
    el.score.value = String(nextScore);
    updateScoreDisplay();
    updateAverageScore();
  }
  buildLeaderboardRows();
  buildFavoritesRows();
}

el.menuToggle.addEventListener("click", () => {
  document.body.classList.toggle("drawer-open");
});

el.navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.nav));
});

el.toLeaderboardBtn?.addEventListener("click", () => {
  setActiveSection("leaderboard");
});

el.lookupBtn?.addEventListener("click", async () => {
  if (!state.sessionName) {
    el.wineStatus.textContent = "Créez ou rejoignez une session d’abord.";
    return;
  }

  const file = el.bottlePhoto.files?.[0];
  if (!file) {
    el.wineStatus.textContent = "Veuillez d’abord prendre ou sélectionner une photo de la bouteille.";
    return;
  }

  const form = new FormData();
  form.append("image", file);

  el.wineStatus.textContent = "Recherche des infos sur la bouteille...";
  try {
    const response = await fetch(`${API_BASE}/api/wines/lookup`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error("lookup failed");
    const data = await response.json();

    el.wineName.value = data.name || "";
    el.winery.value = data.winery || "";
    el.vintage.value = data.vintage || "";
    el.country.value = data.country || "";
    el.wineStatus.textContent = "Remplissage automatique terminé. Veuillez confirmer les valeurs.";
  } catch {
    el.wineStatus.textContent = "Recherche indisponible. Saisissez les détails manuellement.";
  }
});

el.addWineBtn.addEventListener("click", async () => {
  if (!state.sessionName) {
    el.wineStatus.textContent = "Créez ou rejoignez une session d’abord.";
    return;
  }

  let imageBase64 = "";
  const photoFile = el.bottlePhoto.files?.[0];
  if (photoFile) {
    try {
      imageBase64 = await compressImageToDataUrl(photoFile, { maxDimension: 1024, quality: 0.7 });
      const bytes = dataUrlToBytes(imageBase64);
      const maxBytes = 1_000_000;
      if (bytes > maxBytes) {
        el.wineStatus.textContent =
          "La photo est trop volumineuse même après compression. Utilisez une image plus petite.";
        return;
      }
    } catch {
      el.wineStatus.textContent = "La photo n’a pas pu être lue. Ajoutez sans image.";
    }
  }

  const wine = {
    name: el.wineName.value.trim(),
    winery: el.winery.value.trim(),
    vintage: el.vintage.value.trim(),
    country: el.country.value.trim(),
    source: "manual",
    imageBase64,
    sessionName: state.sessionName,
  };

  if (!wine.name) {
    el.wineStatus.textContent = "Le nom du vin est obligatoire.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/wines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wine),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Échec de l’enregistrement du vin.");
      throw new Error(message);
    }
    el.wineStatus.textContent = "Vin enregistré.";
    el.wineName.value = "";
    el.winery.value = "";
    el.vintage.value = "";
    el.country.value = "";
    el.bottlePhoto.value = "";
    await loadWines();
    await loadRatings();
  } catch (error) {
    el.wineStatus.textContent = `Échec de l’enregistrement du vin. ${error.message}`;
  }
});

el.submitRatingBtn?.addEventListener("click", async () => {
  await saveRating();
});

el.participantName.addEventListener("input", () => {
  state.participantName = el.participantName.value.trim();
  localStorage.setItem("ttw_participantName", state.participantName);
  if (state.selectedWineId) {
    el.notes.value = getNoteForWine(state.selectedWineId);
    updateNotesCount();
    const existingScore = getScoreForWine(state.selectedWineId);
    const nextScore = Number.isFinite(existingScore) ? normalizeScore(existingScore) : 50;
    el.score.value = String(nextScore);
    updateScoreDisplay();
    updateAverageScore();
  }
  scheduleAutoSave();
});

el.selectedWineImage.addEventListener("click", () => {
  if (el.selectedWineImage.src) {
    openLightbox(el.selectedWineImage.src);
  }
});

el.favoriteBtn?.addEventListener("click", () => {
  const wineId = el.favoriteBtn.dataset.wineId || "";
  if (!wineId) return;
  if (state.favorites.has(wineId)) {
    state.favorites.delete(wineId);
  } else {
    state.favorites.add(wineId);
  }
  saveFavorites();
  el.favoriteBtn.classList.toggle("is-active", state.favorites.has(wineId));
  const heart = el.favoriteBtn.querySelector(".heart-icon");
  if (heart) {
    heart.textContent = state.favorites.has(wineId) ? "♥" : "♡";
  }
  buildLeaderboardRows();
  buildFavoritesRows();
});

el.lightboxClose.addEventListener("click", closeLightbox);
el.imageLightbox.addEventListener("click", (event) => {
  if (event.target === el.imageLightbox) {
    closeLightbox();
  }
});

el.leaderboardModalClose?.addEventListener("click", closeLeaderboardModal);
el.leaderboardModal?.addEventListener("click", (event) => {
  if (event.target === el.leaderboardModal) {
    closeLeaderboardModal();
  }
});

el.modalOpenNotesBtn?.addEventListener("click", () => {
  const wineId = el.modalOpenNotesBtn.dataset.wineId || "";
  if (!wineId) return;
  closeLeaderboardModal();
  setSelectedWine(wineId);
  setActiveSection("notes");
});

el.joinNameConflictConfirmBtn?.addEventListener("click", () => {
  resolveJoinConflict("confirm");
});

el.joinNameConflictCancelBtn?.addEventListener("click", () => {
  resolveJoinConflict("cancel");
});

el.joinNameConflictModal?.addEventListener("click", (event) => {
  if (event.target === el.joinNameConflictModal) {
    resolveJoinConflict("cancel");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
    closeLeaderboardModal();
    resolveJoinConflict("cancel");
  }
});

el.resetSessionBtn?.addEventListener("click", () => {
  clearSessionInfo();
  el.sessionStatus.textContent = "Session réinitialisée.";
  el.participantName.value = "";
  el.sessionCode.value = "";
  setActiveSection("notes");
});

function updateScoreDisplay() {
  const value = normalizeScore(el.score.value);
  el.score.value = String(value);
  const min = Number(el.score.min) || 0;
  const max = Number(el.score.max) || 100;
  const percent = ((value - min) / (max - min)) * 100;
  el.scoreValue.textContent = String(value);
  if (el.scoreLabel) {
    el.scoreLabel.textContent = scoreLabels[value] || "";
    el.scoreLabel.style.color = `hsl(${(percent * 120) / 100}, 65%, 35%)`;
  }
  el.score.style.setProperty("--range-fill", `${percent}%`);
  const track = el.score.parentElement;
  if (track) {
    const thumbSize = 34;
    const width = el.score.getBoundingClientRect().width || 1;
    const usable = Math.max(1, width - thumbSize);
    const center = (percent / 100) * usable + thumbSize / 2;
    const bubbleWidth = el.scoreValue.offsetWidth || 1;
    const minX = bubbleWidth / 2;
    const maxX = Math.max(minX, width - bubbleWidth / 2);
    const clamped = Math.min(maxX, Math.max(minX, center));
    track.style.setProperty("--bubble-x", `${clamped}px`);
    track.style.setProperty("--score-color", `hsl(${(percent * 120) / 100}, 65%, 35%)`);
  }
}

el.score.addEventListener("input", updateScoreDisplay);
el.score.addEventListener("input", () => scheduleAutoSave(500));
el.notes.addEventListener("input", () => scheduleAutoSave(1500));
el.notes.addEventListener("input", updateNotesCount);
el.notes.addEventListener("blur", () => scheduleAutoSave(0));

updateScoreDisplay();

el.joinSessionBtn.addEventListener("click", async () => {
  const code = el.sessionCode.value.trim().toUpperCase();
  const participant = el.participantName.value.trim();
  if (!code || !participant) {
    el.sessionStatus.textContent = "Code de session et prénom requis.";
    return;
  }

  el.sessionStatus.textContent = "Connexion à la session...";
  try {
    const response = await fetch(`${API_BASE}/api/sessions/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, participant }),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Session introuvable ou inactive.");
      throw new Error(message);
    }
    const data = await response.json();
    setSessionInfo({ name: data.name, code, participant });
    await loadWines();
    await loadRatings();
    const nameExists =
      Boolean(data.participantExists) ||
      participantNameExistsInRatings(participant) ||
      (await participantNameExistsInSession(data.name, participant));
    if (nameExists) {
      const choice = await openJoinConflictModal();
      if (choice !== "confirm" && choice !== true) {
        clearSessionInfo();
        el.sessionCode.value = code;
        el.participantName.value = participant;
        setActiveSection("wine");
        return;
      }
    }
    el.sessionStatus.textContent = "Session rejointe.";
    buildLeaderboardRows();
  } catch (error) {
    el.sessionStatus.textContent = error?.message || "Session introuvable ou inactive.";
  }
});

(() => {
  loadFavorites();
  const storedCode = localStorage.getItem("ttw_sessionCode") || "";
  const storedParticipant = localStorage.getItem("ttw_participantName") || "";
  if (storedCode || storedParticipant) {
    el.sessionCode.value = storedCode;
    el.participantName.value = storedParticipant;
  }
  if (el.sessionCard) {
    el.sessionCard.classList.remove("is-hidden");
  }
  el.sessionStatus.textContent = "";
})();

loadWines();
loadRatings();
setActiveSection("notes");

el.refreshLeaderboardBtn?.addEventListener("click", async () => {
  if (!state.sessionName) {
    if (el.leaderboardStatus) {
      el.leaderboardStatus.textContent = "Rejoignez une session d’abord.";
    }
    return;
  }

  if (el.leaderboardStatus) {
    el.leaderboardStatus.textContent = "Rafraîchissement...";
  }
  await loadWines();
  await loadRatings();
  if (el.leaderboardStatus) {
    el.leaderboardStatus.textContent = "Classement mis à jour.";
  }
});
