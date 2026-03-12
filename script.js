let cards = [];
let filteredCards = [];
let owned = JSON.parse(localStorage.getItem("owned") || "{}");

const statsEl = document.getElementById("stats");
const progressFillEl = document.getElementById("progressFill");
const cardGridEl = document.getElementById("cardGrid");
const tradeListEl = document.getElementById("tradeList");
const teamProgressEl = document.getElementById("teamProgress");
const cardCountLabelEl = document.getElementById("cardCountLabel");

const searchEl = document.getElementById("search");
const setFilterEl = document.getElementById("setFilter");
const teamFilterEl = document.getElementById("teamFilter");
const rarityFilterEl = document.getElementById("rarityFilter");

fetch("cards.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Could not load cards.json");
    }
    return response.json();
  })
  .then(data => {
    cards = data;
    applySharedCollectionFromUrl();
    populateFilters();
    applyFilters();
    updateStats();
    renderTeamProgress();
  })
  .catch(error => {
    console.error(error);
    cardGridEl.innerHTML = `<div class="empty-message">Could not load cards.json. Check that the file is valid JSON and uploaded correctly.</div>`;
  });

function normaliseRarityClass(rarity) {
  return String(rarity || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function populateFilters() {
  const sets = [...new Set(cards.map(card => card.set).filter(Boolean))].sort();
  const teams = [...new Set(cards.map(card => card.team).filter(Boolean))].sort();
  const rarities = [...new Set(cards.map(card => card.rarity).filter(Boolean))].sort();

  for (const set of sets) {
    const option = document.createElement("option");
    option.value = set;
    option.textContent = set;
    setFilterEl.appendChild(option);
  }

  for (const team of teams) {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    teamFilterEl.appendChild(option);
  }

  for (const rarity of rarities) {
    const option = document.createElement("option");
    option.value = rarity;
    option.textContent = rarity;
    rarityFilterEl.appendChild(option);
  }
}

function applyFilters() {
  const q = searchEl.value.trim().toLowerCase();
  const selectedSet = setFilterEl.value;
  const selectedTeam = teamFilterEl.value;
  const selectedRarity = rarityFilterEl.value;

  filteredCards = cards.filter(card => {
    const matchesSearch =
      !q ||
      String(card.id).toLowerCase().includes(q) ||
      String(card.player || "").toLowerCase().includes(q) ||
      String(card.team || "").toLowerCase().includes(q) ||
      String(card.type || "").toLowerCase().includes(q) ||
      String(card.subtype || "").toLowerCase().includes(q) ||
      String(card.set || "").toLowerCase().includes(q) ||
      String(card.rarity || "").toLowerCase().includes(q);

    const matchesSet = !selectedSet || card.set === selectedSet;
    const matchesTeam = !selectedTeam || card.team === selectedTeam;
    const matchesRarity = !selectedRarity || card.rarity === selectedRarity;

    return matchesSearch && matchesSet && matchesTeam && matchesRarity;
  });

  renderCards(filteredCards);
}

function renderCards(list) {
  cardGridEl.innerHTML = "";

  if (!list.length) {
    cardGridEl.innerHTML = `<div class="empty-message">No cards match your search/filter.</div>`;
    cardCountLabelEl.textContent = "Showing 0 cards";
    return;
  }

  cardCountLabelEl.textContent = `Showing ${list.length} card${list.length === 1 ? "" : "s"}`;

  for (const card of list) {
    const count = owned[card.id] || 0;
    const rarityClass = normaliseRarityClass(card.rarity);

    const div = document.createElement("div");
    div.className = "card";
    if (count > 0) div.classList.add("owned");

    div.innerHTML = `
      <div class="card-header">
        <div class="card-id">#${card.id}</div>
        <div class="card-set">${escapeHtml(card.set || "")}</div>
      </div>

      <div class="card-player">${escapeHtml(card.player || "")}</div>
      <div class="card-team">${escapeHtml(card.team || "")}</div>

      <div class="meta">
        ${card.type ? `<span class="badge type">${escapeHtml(card.type)}</span>` : ""}
        ${card.subtype ? `<span class="badge subtype">${escapeHtml(card.subtype)}</span>` : ""}
        ${card.rarity ? `<span class="badge rarity ${rarityClass}">${escapeHtml(card.rarity)}</span>` : ""}
      </div>

      <div class="card-footer">
        <span>${count > 0 ? "Owned" : "Not owned"}</span>
        <span class="count-box">${count > 1 ? `Duplicate x${count - 1}` : count === 1 ? "x1" : ""}</span>
      </div>
    `;

    div.addEventListener("click", () => toggle(card.id));
    cardGridEl.appendChild(div);
  }
}

function toggle(id) {
  owned[id] = (owned[id] || 0) + 1;

  if (owned[id] > 3) {
    delete owned[id];
  }

  save();
}

function save() {
  localStorage.setItem("owned", JSON.stringify(owned));
  applyFilters();
  updateStats();
  renderTeamProgress();
}

function updateStats() {
  const uniqueOwnedCount = cards.filter(card => (owned[card.id] || 0) > 0).length;
  const totalCards = cards.length;
  const percent = totalCards ? Math.round((uniqueOwnedCount / totalCards) * 100) : 0;

  const duplicates = Object.values(owned).reduce((sum, count) => {
    return sum + Math.max(0, count - 1);
  }, 0);

  statsEl.textContent = `Owned ${uniqueOwnedCount} / ${totalCards} (${percent}%) • Duplicates ${duplicates}`;
  progressFillEl.style.width = `${percent}%`;
}

function renderTeamProgress() {
  const grouped = {};

  for (const card of cards) {
    const team = card.team || "Other";
    if (!grouped[team]) {
      grouped[team] = { total: 0, owned: 0 };
    }

    grouped[team].total += 1;

    if ((owned[card.id] || 0) > 0) {
      grouped[team].owned += 1;
    }
  }

  const teams = Object.keys(grouped).sort();
  teamProgressEl.innerHTML = "";

  if (!teams.length) {
    teamProgressEl.innerHTML = `<div class="empty-message">No team data available.</div>`;
    return;
  }

  for (const team of teams) {
    const data = grouped[team];
    const percent = data.total ? Math.round((data.owned / data.total) * 100) : 0;

    const div = document.createElement("div");
    div.className = "team-item";
    div.innerHTML = `
      <div class="team-line">
        <span>${escapeHtml(team)}</span>
        <span>${data.owned} / ${data.total} (${percent}%)</span>
      </div>
      <div class="team-bar">
        <div class="team-fill" style="width:${percent}%"></div>
      </div>
    `;

    teamProgressEl.appendChild(div);
  }
}

function generateTrade() {
  const duplicates = [];
  const missing = [];

  for (const card of cards) {
    const count = owned[card.id] || 0;

    if (count > 1) {
      duplicates.push(`#${card.id} - ${card.player} (${count - 1} dup)`);
    }

    if (count === 0) {
      missing.push(`#${card.id} - ${card.player}`);
    }
  }

  tradeListEl.textContent =
`DUPLICATES
${duplicates.length ? duplicates.join("\n") : "None"}

NEED
${missing.length ? missing.join("\n") : "None"}`;
}

function shareCollection() {
  const ownedList = Object.keys(owned)
    .filter(id => owned[id] > 0)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const url = `${location.origin}${location.pathname}?owned=${encodeURIComponent(ownedList.join(","))}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => alert("Collection link copied to clipboard"))
      .catch(() => prompt("Copy this link:", url));
  } else {
    prompt("Copy this link:", url);
  }
}

function resetCollection() {
  const confirmed = confirm("Reset your whole collection and duplicates?");
  if (!confirmed) return;

  owned = {};
  localStorage.setItem("owned", JSON.stringify(owned));
  tradeListEl.textContent = "No trade list generated yet.";
  applyFilters();
  updateStats();
  renderTeamProgress();
}

function applySharedCollectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sharedOwned = params.get("owned");

  if (!sharedOwned) return;

  const ids = sharedOwned.split(",").map(x => x.trim()).filter(Boolean);
  const sharedState = {};

  for (const id of ids) {
    sharedState[id] = 1;
  }

  owned = sharedState;
  localStorage.setItem("owned", JSON.stringify(owned));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

searchEl.addEventListener("input", applyFilters);
setFilterEl.addEventListener("change", applyFilters);
teamFilterEl.addEventListener("change", applyFilters);
rarityFilterEl.addEventListener("change", applyFilters);