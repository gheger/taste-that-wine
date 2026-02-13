const state = {
  wines: [],
  ratings: [],
  selectedWineId: "",
  sessionName: "",
  sessionCode: "",
  participantName: "",
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
  submitRatingBtn: document.getElementById("submitRatingBtn"),
  ratingStatus: document.getElementById("ratingStatus"),
  wineTableBody: document.getElementById("wineTableBody"),
  selectedWineImage: document.getElementById("selectedWineImage"),
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

const scoreLabels = {
  0: "No way",
  10: "Bon à se laver les pieds",
  20: "Pour une sauce, allez",
  30: "Digne des meilleures gorons",
  40: "Correct sans plus",
  50: "Pas mal du tout",
  60: "Bon",
  70: "Très bon",
  80: "Excellent",
  90: "Exceptionnel",
  100: "Le meilleur vin du monde",
};

function normalizeScore(value) {
  const clamped = Math.min(100, Math.max(10, Number(value) || 50));
  return Math.round(clamped / 10) * 10;
}

function setSelectedWine(wineId) {
  state.selectedWineId = wineId;
  render();
  el.notes.value = wineId ? getNoteForWine(wineId) : "";
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
    ? `Session active : ${state.sessionName} (code ${state.sessionCode})`
    : "";
  if (el.sessionCard) {
    el.sessionCard.classList.toggle("is-hidden", Boolean(state.sessionName));
  }
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

  const countryFlags = {
    France: "🇫🇷",
    Italy: "🇮🇹",
    Spain: "🇪🇸",
    Portugal: "🇵🇹",
    "United States": "🇺🇸",
    USA: "🇺🇸",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    Australia: "🇦🇺",
    "New Zealand": "🇳🇿",
    Germany: "🇩🇪",
    Austria: "🇦🇹",
    "South Africa": "🇿🇦",
    Greece: "🇬🇷",
  };

  state.wines.forEach((wine) => {
    const row = document.createElement("tr");
    row.dataset.wineId = wine.id;
    const rowTasted = tastedSet.has(wine.id);
    const rowMark = rowTasted ? "✓" : "?";
    const country = wine.country || "";
    const flag = countryFlags[country] || "";
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
      el.notes.focus();
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

    const response = await fetch(`/api/wines?session=${encodeURIComponent(state.sessionName)}`);
    if (!response.ok) throw new Error("wines api failed");
    const data = await response.json();
    state.wines = Array.isArray(data.records) ? data.records : [];
  } catch {
    state.wines = [];
  }
  render();
}

async function loadRatings() {
  try {
    if (!state.sessionName) {
      state.ratings = [];
      render();
      return;
    }

    const response = await fetch(`/api/ratings?session=${encodeURIComponent(state.sessionName)}`);
    if (!response.ok) throw new Error("ratings api failed");
    const data = await response.json();
    state.ratings = Array.isArray(data.records) ? data.records : [];
  } catch {
    state.ratings = [];
  }
  render();
  if (state.selectedWineId) {
    el.notes.value = getNoteForWine(state.selectedWineId);
    const existingScore = getScoreForWine(state.selectedWineId);
    const nextScore = Number.isFinite(existingScore) ? normalizeScore(existingScore) : 50;
    el.score.value = String(nextScore);
    updateScoreDisplay();
    updateAverageScore();
  }
}

el.menuToggle.addEventListener("click", () => {
  document.body.classList.toggle("drawer-open");
});

el.navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.nav));
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
    const response = await fetch("/api/wines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wine),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Échec de l’enregistrement du vin.");
      throw new Error(message);
    }
    el.wineStatus.textContent = "Vin ajouté et enregistré dans Airtable.";
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

el.submitRatingBtn.addEventListener("click", async () => {
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

  if (!Number.isInteger(score) || score < 1 || score > 100) {
    el.ratingStatus.textContent = "La note doit être un entier de 1 à 100.";
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
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rating),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Échec de l’enregistrement des notes de dégustation.");
      throw new Error(message);
    }
    el.ratingStatus.textContent = "Notes de dégustation enregistrées dans Airtable.";
    await loadRatings();
  } catch (error) {
    el.ratingStatus.textContent = `Échec des notes de dégustation. ${error.message}`;
  }
});

el.participantName.addEventListener("input", () => {
  state.participantName = el.participantName.value.trim();
  localStorage.setItem("ttw_participantName", state.participantName);
  if (state.selectedWineId) {
    el.notes.value = getNoteForWine(state.selectedWineId);
    const existingScore = getScoreForWine(state.selectedWineId);
    const nextScore = Number.isFinite(existingScore) ? normalizeScore(existingScore) : 50;
    el.score.value = String(nextScore);
    updateScoreDisplay();
    updateAverageScore();
  }
});

el.selectedWineImage.addEventListener("click", () => {
  if (el.selectedWineImage.src) {
    openLightbox(el.selectedWineImage.src);
  }
});

el.lightboxClose.addEventListener("click", closeLightbox);
el.imageLightbox.addEventListener("click", (event) => {
  if (event.target === el.imageLightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
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
  const min = Number(el.score.min) || 10;
  const max = Number(el.score.max) || 100;
  const percent = ((value - min) / (max - min)) * 100;
  el.scoreValue.textContent = String(value);
  if (el.scoreLabel) {
    el.scoreLabel.textContent = scoreLabels[value] || "";
  }
  el.score.style.setProperty("--range-fill", `${percent}%`);
}

el.score.addEventListener("input", updateScoreDisplay);

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
    const response = await fetch("/api/sessions/join", {
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
    el.sessionStatus.textContent = "Session rejointe.";
    await loadWines();
    await loadRatings();
  } catch (error) {
    el.sessionStatus.textContent = error?.message || "Session introuvable ou inactive.";
  }
});

(() => {
  const storedName = localStorage.getItem("ttw_sessionName") || "";
  const storedCode = localStorage.getItem("ttw_sessionCode") || "";
  const storedParticipant = localStorage.getItem("ttw_participantName") || "";
  if (storedName || storedCode || storedParticipant) {
    el.sessionCode.value = storedCode;
    el.participantName.value = storedParticipant;
  }

  if (storedCode && storedParticipant) {
    el.sessionStatus.textContent = "Reconnexion à la session...";
    fetch("/api/sessions/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: storedCode, participant: storedParticipant }),
    })
      .then(async (response) => {
        if (response.ok) return response.json();
        const message = await readErrorMessage(response, "Session introuvable ou inactive.");
        throw new Error(message);
      })
      .then((data) => {
        if (data?.name) {
          setSessionInfo({ name: data.name, code: storedCode, participant: storedParticipant });
          el.sessionStatus.textContent = "Session rejointe.";
          loadWines();
          loadRatings();
        } else {
          clearSessionInfo();
          el.sessionStatus.textContent = "Session introuvable ou inactive.";
        }
      })
      .catch((error) => {
        clearSessionInfo();
        el.sessionStatus.textContent = error?.message || "Session introuvable ou inactive.";
      });
  } else if (el.sessionCard) {
    el.sessionCard.classList.remove("is-hidden");
  }
})();

loadWines();
loadRatings();
setActiveSection("notes");
