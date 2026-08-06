const BASE = "https://api.pokemontcg.io/v2";

export const RARITIES = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Rare Ultra", "Rare Secret",
  "Amazing Rare", "Rare Break", "Rare Prism Star", "Rare Promo", "Rare Shining", "Rare Shiny", "LEGEND", "Promo"
];
export const POKEMON_TYPES = ["Colorless", "Darkness", "Dragon", "Fairy", "Fighting", "Fire", "Grass", "Lightning", "Metal", "Psychic", "Water"];
export const SUPERTYPES = ["Pokémon", "Trainer", "Energy"];
export const CONDITIONS = ["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"];
export const VARIANTS = ["Normal", "Reverse Holo", "Holo", "1st Edition", "Promo"];
export const GRADE_COMPANIES = ["Raw", "PSA", "BGS", "CGC", "ACE", "Other"];

export function getRarityStyle(rarity = "") {
  const r = (rarity || "").toLowerCase();
  if (r.includes("secret") || r.includes("rainbow")) return { color: "#fb7185", glow: "rgba(251,113,133,0.55)" };
  if (r.includes("ultra") || r.includes("vmax") || r.includes("vstar") || r.includes("special") || r === "v" || r.endsWith(" ex") || r.endsWith(" gx")) return { color: "#fbbf24", glow: "rgba(251,191,36,0.55)" };
  if (r.includes("holo") || r.includes("reverse") || r.includes("shiny") || r.includes("shining") || r.includes("prism")) return { color: "#a78bfa", glow: "rgba(167,139,250,0.5)" };
  if (r.includes("rare")) return { color: "#3b82f6", glow: "rgba(59,130,246,0.5)" };
  if (r.includes("uncommon")) return { color: "#34d399", glow: "rgba(52,211,153,0.4)" };
  return { color: "#94a3b8", glow: "rgba(148,163,184,0.3)" };
}

// Partial subsets already merged into their parent set — hidden from the list.
const HIDDEN_SET_IDS = new Set(["swsh12pt5gg"]); // Crown Zenith: Galarian Gallery → merged into Crown Zenith
// Extra set ids to fetch alongside a parent so packs contain the full set.
const SET_EXTRAS = { swsh12pt5: ["swsh12pt5gg"] };

// The public API occasionally returns an HTML rate-limit page instead of JSON.
// Validate the content-type and retry a few times before giving up.
async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 700 * (attempt + 1))); continue; }
        return null;
      }
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) return null;
        if (attempt < 3) { await new Promise((r) => setTimeout(r, 700 * (attempt + 1))); continue; }
        return null;
      }
      return await res.json();
    } catch {
      if (attempt < 3) { await new Promise((r) => setTimeout(r, 700 * (attempt + 1))); continue; }
      return null;
    }
  }
  return null;
}

export async function getSets() {
  const json = await fetchJson(`${BASE}/sets?orderBy=-releaseDate&pageSize=100`);
  if (!json) throw new Error("Failed to load sets");
  return json.data.filter((s) => {
    if (HIDDEN_SET_IDS.has(s.id)) return false;
    // Hide bulk energy promo sets (e.g. "Scarlet & Violet Energies")
    if (/\benergies\b/i.test(s.name)) return false;
    return true;
  });
}

export async function getCard(id) {
  const json = await fetchJson(`${BASE}/cards/${id}`);
  if (!json) throw new Error("Failed to load card");
  return json.data;
}

export function buildSearchQuery({ query, setId, rarity, type, supertype } = {}) {
  const parts = [];
  if (query && query.trim()) {
    const numMatch = query.trim().match(/^(.+?)\s+(\d+)\/(\d+)$/);
    if (numMatch) {
      parts.push(`name:"${numMatch[1].trim()}"`);
      parts.push(`number:${numMatch[2]}`);
      parts.push(`set.printedTotal:${numMatch[3]}`);
    } else {
      parts.push(`name:"${query.trim()}"`);
    }
  }
  if (setId) parts.push(`set.id:${setId}`);
  if (rarity) parts.push(`rarity:"${rarity}"`);
  if (type) parts.push(`types:${type}`);
  if (supertype) parts.push(`supertype:${supertype}`);
  return parts.join(" ");
}

export async function searchCards({ query, setId, rarity, type, supertype, page = 1, pageSize = 36, orderBy } = {}) {
  const q = buildSearchQuery({ query, setId, rarity, type, supertype });
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (orderBy) params.set("orderBy", orderBy);
  const json = await fetchJson(`${BASE}/cards?${params.toString()}`);
  if (!json) return { cards: [], totalCount: 0, page, pageSize };
  return { cards: json.data || [], totalCount: json.totalCount || 0, page, pageSize };
}

export async function getSetCards(setId) {
  const ids = [setId, ...(SET_EXTRAS[setId] || [])];
  let all = [];
  for (const id of ids) {
    let page = 1;
    let totalCount = Infinity;
    while (all.length < totalCount && page <= 6) {
      const params = new URLSearchParams();
      params.set("q", `set.id:${id}`);
      params.set("page", String(page));
      params.set("pageSize", "250");
      const json = await fetchJson(`${BASE}/cards?${params.toString()}`);
      if (!json) break;
      totalCount = Math.max(totalCount, json.totalCount || 0);
      all = all.concat(json.data || []);
      if (!json.data || json.data.length < 250) break;
      page++;
    }
  }
  return all;
}

export function getCardPrice(card) {
  if (!card) return 0;
  const cm = card.cardmarket?.prices;
  if (cm) {
    if (cm.averageSellPrice > 0) return cm.averageSellPrice;
    if (cm.trendPrice > 0) return cm.trendPrice;
    if (cm.avg30 > 0) return cm.avg30;
    if (cm.avg7 > 0) return cm.avg7;
    if (cm.avg1 > 0) return cm.avg1;
  }
  const tp = card.tcgplayer?.prices;
  if (tp) {
    let fallback = 0;
    for (const k of Object.keys(tp)) {
      const v = tp[k];
      if (v?.market > 0) return v.market;
      if (v?.mid > 0 && v.mid > fallback) fallback = v.mid;
      else if (v?.low > 0 && v.low > fallback) fallback = v.low;
    }
    if (fallback > 0) return fallback;
  }
  return 0;
}

// Short-term price trend from cardmarket rolling averages (30d → 7d → 1d → now).
// Returns an array of { label, price } for charting, or null if insufficient data.
export function getPriceTrend(card) {
  const cm = card?.cardmarket?.prices;
  if (!cm) return null;
  const pts = [
    { label: "30d", price: cm.avg30 },
    { label: "7d", price: cm.avg7 },
    { label: "1d", price: cm.avg1 },
    { label: "Now", price: cm.averageSellPrice || cm.trendPrice },
  ].filter((p) => p.price && p.price > 0);
  return pts.length >= 2 ? pts : null;
}

function categorizeByRarity(cards) {
  const buckets = { common: [], uncommon: [], rare: [], holo: [], ultra: [], secret: [] };
  for (const c of cards) {
    const r = (c.rarity || "").toLowerCase();
    if (r.includes("secret") || r.includes("rainbow")) buckets.secret.push(c);
    else if (r.includes("ultra") || r.includes("vmax") || r.includes("vstar") || r.includes("special") || r === "v" || r.endsWith(" ex") || r.endsWith(" gx")) buckets.ultra.push(c);
    else if (r.includes("holo") || r.includes("reverse") || r.includes("shiny") || r.includes("shining")) buckets.holo.push(c);
    else if (r.includes("rare")) buckets.rare.push(c);
    else if (r.includes("uncommon")) buckets.uncommon.push(c);
    else buckets.common.push(c);
  }
  return buckets;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Builds a pack in legit reveal order: commons → uncommons → reverse → rare → hit.
// The card is left UN-shuffled so the user reveals bulk first and the chase last.
export function buildPack(setCards) {
  const b = categorizeByRarity(setCards);
  const pool = (arr) => (arr.length ? arr : setCards);
  const pack = [];
  for (let i = 0; i < 5; i++) pack.push(pick(pool(b.common)));        // bulk commons
  for (let i = 0; i < 3; i++) pack.push(pick(pool(b.uncommon)));      // uncommons
  const revPool = [...b.common, ...b.uncommon];
  pack.push(revPool.length ? pick(revPool) : pick(pool(b.rare)));     // reverse holo
  pack.push(pick(pool(b.rare.length ? b.rare : b.uncommon)));        // rare slot
  const roll = Math.random();                                        // hit slot (climax)
  let hit;
  if (roll < 0.06 && b.secret.length) hit = pick(b.secret);
  else if (roll < 0.22 && b.ultra.length) hit = pick(b.ultra);
  else if (roll < 0.5 && b.holo.length) hit = pick(b.holo);
  else hit = pick(pool(b.rare.length ? b.rare : b.common));
  pack.push(hit);
  return pack;
}

// The top 5 most valuable cards in the set — pulling one triggers a celebration.
export function getChaseCardIds(setCards) {
  const sorted = [...setCards]
    .map((c) => ({ id: c.id, price: getCardPrice(c) }))
    .sort((a, b) => b.price - a.price);
  return new Set(sorted.slice(0, 5).filter((x) => x.price > 0).map((x) => x.id));
}