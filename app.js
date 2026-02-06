const state = {
  wines: [],
  ratings: [],
  selectedWineId: "",
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
  wineSelect: document.getElementById("wineSelect"),
  score: document.getElementById("score"),
  notes: document.getElementById("notes"),
  submitRatingBtn: document.getElementById("submitRatingBtn"),
  ratingStatus: document.getElementById("ratingStatus"),
  wineTableBody: document.getElementById("wineTableBody"),
};

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
    img.onerror = () => reject(new Error("Failed to load image for compression."));
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
  const note = state.ratings.find(
    (rating) => rating.wineId === wineId && String(rating.notes || "").trim(),
  );
  return note ? note.notes : "";
}

function setSelectedWine(wineId) {
  state.selectedWineId = wineId;
  render();
  el.notes.value = wineId ? getNoteForWine(wineId) : "";
  document.querySelectorAll(".wine-table tbody tr").forEach((tr) => {
    tr.classList.toggle("active", tr.dataset.wineId === wineId);
  });
}

function render() {
  el.wineTableBody.innerHTML = "";
  el.wineSelect.innerHTML = "";
  const tastedSet = new Set(
    state.ratings
      .filter((rating) => String(rating.notes || "").trim().length > 0)
      .map((rating) => rating.wineId)
      .filter(Boolean),
  );

  if (state.wines.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No wine yet";
    el.wineSelect.append(option);
  }

  state.wines.forEach((wine) => {
    const option = document.createElement("option");
    option.value = wine.id;
    const label = wine.name || wine.id;
    const tastedMark = tastedSet.has(wine.id) ? "?" : "?";
    const selectedMark = wine.id === state.selectedWineId ? " ?" : "";
    option.textContent = `${tastedMark} ${label}${selectedMark}`;
    option.selected = wine.id === state.selectedWineId;
    el.wineSelect.append(option);

    const row = document.createElement("tr");
    row.dataset.wineId = wine.id;
    const rowTasted = tastedSet.has(wine.id);
    const rowMark = rowTasted ? "?" : "?";
    const imageCell = wine.imageBase64
      ? `<img class="wine-thumb" src="${wine.imageBase64}" alt="Wine photo" />`
      : "";
    row.classList.toggle("tasted", rowTasted);
    row.classList.toggle("untasted", !rowTasted);
    row.innerHTML = `
      <td class="wine-cell">${imageCell}<span>${wine.name || "Unknown wine"}</span></td>
      <td>${wine.winery || "Unknown winery"}</td>
      <td>${wine.vintage || "N/A"}</td>
      <td>${wine.country || "N/A"}</td>
      <td class="taste-mark">${rowMark}</td>
    `;
    row.addEventListener("click", () => {
      setSelectedWine(wine.id);
      setActiveSection("notes");
      el.notes.focus();
    });
    el.wineTableBody.append(row);
  });
}

async function loadWines() {
  try {
    const response = await fetch("/api/wines");
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
    const response = await fetch("/api/ratings");
    if (!response.ok) throw new Error("ratings api failed");
    const data = await response.json();
    state.ratings = Array.isArray(data.records) ? data.records : [];
  } catch {
    state.ratings = [];
  }
  render();
}

el.menuToggle.addEventListener("click", () => {
  document.body.classList.toggle("drawer-open");
});

el.navLinks.forEach((link) => {
  link.addEventListener("click", () => setActiveSection(link.dataset.nav));
});

el.wineSelect.addEventListener("change", () => {
  setSelectedWine(el.wineSelect.value);
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
  let imageBase64 = "";
  const photoFile = el.bottlePhoto.files?.[0];
  if (photoFile) {
    try {
      imageBase64 = await compressImageToDataUrl(photoFile, { maxDimension: 1024, quality: 0.7 });
      const bytes = dataUrlToBytes(imageBase64);
      const maxBytes = 1_000_000;
      if (bytes > maxBytes) {
        el.wineStatus.textContent =
          "Photo is too large even after compression. Please use a smaller image.";
        return;
      }
    } catch {
      el.wineStatus.textContent = "Photo could not be read. Add without image.";
    }
  }

  const wine = {
    name: el.wineName.value.trim(),
    winery: el.winery.value.trim(),
    vintage: el.vintage.value.trim(),
    country: el.country.value.trim(),
    source: "manual",
    imageBase64,
  };

  if (!wine.name) {
    el.wineStatus.textContent = "Wine name is required.";
    return;
  }

  try {
    const response = await fetch("/api/wines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wine),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Wine save failed.");
      throw new Error(message);
    }
    el.wineStatus.textContent = "Wine added and saved to Airtable.";
    el.wineName.value = "";
    el.winery.value = "";
    el.vintage.value = "";
    el.country.value = "";
    el.bottlePhoto.value = "";
    await loadWines();
    await loadRatings();
  } catch (error) {
    el.wineStatus.textContent = `Wine save failed. ${error.message}`;
  }
});

el.submitRatingBtn.addEventListener("click", async () => {
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
    wineId,
    score,
    notes: el.notes.value.trim(),
  };

  try {
    const response = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rating),
    });
    if (!response.ok) {
      const message = await readErrorMessage(response, "Tasting notes save failed.");
      throw new Error(message);
    }
    el.ratingStatus.textContent = "Tasting notes saved to Airtable.";
    await loadRatings();
  } catch (error) {
    el.ratingStatus.textContent = `Tasting notes failed. ${error.message}`;
  }
});

loadWines();
loadRatings();
setActiveSection("notes");
