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
  if (r.includes("special illustration")) return { color: "#f472b6", glow: "rgba(244,114,182,0.55)" };
  if (r.includes("ultra") || r.includes("vmax") || r.includes("vstar") || r.includes("special") || r === "v" || r.endsWith(" ex") || r.endsWith(" gx")) return { color: "#fbbf24", glow: "rgba(251,191,36,0.55)" };
  if (r.includes("illustration")) return { color: "#fb923c", glow: "rgba(251,146,60,0.5)" };
  if (r.includes("holo") || r.includes("reverse") || r.includes("shiny") || r.includes("shining") || r.includes("prism")) return { color: "#a78bfa", glow: "rgba(167,139,250,0.5)" };
  if (r.includes("rare")) return { color: "#3b82f6", glow: "rgba(59,130,246,0.5)" };
  if (r.includes("uncommon")) return { color: "#34d399", glow: "rgba(52,211,153,0.4)" };
  return { color: "#94a3b8", glow: "rgba(148,163,184,0.3)" };
}

// --- Local cache so sets/cards load instantly after first fetch and the app
// stays usable when the public API rate-limits or hiccups. ---
function cacheGet(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.t < ttlMs) return parsed.v;
    localStorage.removeItem(key);
  } catch {}
  return null;
}
function cacheAny(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).v;
  } catch { return null; }
}
function cachePut(key, val) {
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: val })); } catch {}
}

// Partial subsets already merged into their parent set — hidden from the list.
const HIDDEN_SET_IDS = new Set(["swsh12pt5gg"]); // Crown Zenith: Galarian Gallery → merged into Crown Zenith
// Extra set ids to fetch alongside a parent so packs contain the full set.
const SET_EXTRAS = { swsh12pt5: ["swsh12pt5gg"] };

// The public API occasionally returns an HTML rate-limit page instead of JSON.
// Validate the content-type and retry a few times before giving up.
// Fetch with a hard timeout so a hung/rate-limited request fails fast instead
// of stalling the whole pack-opening flow.
async function fetchJson(url, { timeoutMs = 12000, retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      clearTimeout(timer);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); continue; }
        return null;
      }
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) return null;
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); continue; }
        return null;
      }
      return await res.json();
    } catch {
      clearTimeout(timer);
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 600 * (attempt + 1))); continue; }
      return null;
    }
  }
  return null;
}

export async function getSets() {
  const cached = cacheGet("pk_sets", 24 * 3600 * 1000);
  if (cached) return cached;
  const json = await fetchJson(`${BASE}/sets?orderBy=-releaseDate&pageSize=100`);
  if (!json) {
    const stale = cacheAny("pk_sets");
    if (stale) return stale;
    return []; // never throw — callers degrade gracefully with an empty list
  }
  const filtered = json.data.filter((s) => {
    if (HIDDEN_SET_IDS.has(s.id)) return false;
    if (/\benergies\b/i.test(s.name)) return false; // hide bulk energy promo sets
    return true;
  });
  cachePut("pk_sets", filtered);
  return filtered;
  // Never throw — callers can degrade gracefully with an empty set list.
}

export async function getCard(id) {
  const key = `pk_card_${id}`;
  const cached = cacheGet(key, 6 * 3600 * 1000);
  if (cached) return cached;
  const json = await fetchJson(`${BASE}/cards/${id}`);
  if (!json) {
    const stale = cacheAny(key);
    if (stale) return stale;
    throw new Error("Failed to load card");
  }
  cachePut(key, json.data);
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

// Fetch the full set as fast as possible: page 1 first (to learn totalCount),
// then all remaining pages IN PARALLEL. Cached for 6h so re-opens are instant.
export async function getSetCards(setId) {
  const key = `pk_cards_${setId}`;
  const cached = cacheGet(key, 6 * 3600 * 1000);
  if (cached) return cached;
  const ids = [setId, ...(SET_EXTRAS[setId] || [])];
  let all = [];
  for (const id of ids) {
    const p1 = new URLSearchParams({ q: `set.id:${id}`, page: "1", pageSize: "250" });
    const first = await fetchJson(`${BASE}/cards?${p1.toString()}`, { retries: 1, timeoutMs: 8000 });
    if (!first || !first.data) continue;
    all = all.concat(first.data);
    const total = first.totalCount || first.data.length;
    const pages = Math.min(6, Math.ceil(total / 250));
    if (pages > 1) {
      const rest = [];
      for (let p = 2; p <= pages; p++) {
        const pp = new URLSearchParams({ q: `set.id:${id}`, page: String(p), pageSize: "250" });
        rest.push(fetchJson(`${BASE}/cards?${pp.toString()}`, { retries: 1, timeoutMs: 8000 }));
      }
      const results = await Promise.all(rest);
      for (const r of results) if (r && r.data) all = all.concat(r.data);
    }
  }
  if (all.length) { cachePut(key, all); return all; }
  const stale = cacheAny(key);
  return stale || all;
}

// Price: prefer TCGplayer's market price (reliable, native USD). Cardmarket data
// is occasionally wildly inflated for popular commons (e.g. 151 Bulbasaur #1
// reports €79.89 for a $0.25 card), so it's a fallback only. Across TCGplayer
// variants we take the LOWEST market so a holofoil/reverse entry can't inflate a
// Common.
export function getCardPrice(card) {
  if (!card) return 0;
  const tp = card.tcgplayer?.prices;
  if (tp) {
    // Collect the best available price across all TCGPlayer variants.
    // Priority: market (actual sales) → directLow → low (lowest listing) → mid (median listing).
    // We never use `high` — it overestimates card value.
    let minMarket = 0, minDirectLow = 0, minLow = 0, minMid = 0;
    for (const k of Object.keys(tp)) {
      const p = tp[k];
      const m = p?.market;
      if (m > 0 && (minMarket === 0 || m < minMarket)) minMarket = m;
      const dl = p?.directLow;
      if (dl > 0 && (minDirectLow === 0 || dl < minDirectLow)) minDirectLow = dl;
      const l = p?.low;
      if (l > 0 && (minLow === 0 || l < minLow)) minLow = l;
      const md = p?.mid;
      if (md > 0 && (minMid === 0 || md < minMid)) minMid = md;
    }
    if (minMarket > 0) return minMarket;
    if (minDirectLow > 0) return minDirectLow;
    if (minLow > 0) return minLow;
    if (minMid > 0) return minMid;
  }
  const cm = card.cardmarket?.prices;
  if (cm) {
    if (cm.averageSellPrice > 0) return cm.averageSellPrice;
    if (cm.trendPrice > 0) return cm.trendPrice;
    if (cm.avg30 > 0) return cm.avg30;
    if (cm.avg7 > 0) return cm.avg7;
    if (cm.avg1 > 0) return cm.avg1;
  }
  return 0;
}

// Short-term price trend from cardmarket rolling averages (30d → 7d → 1d → now).
// Cardmarket is the only time-series source, but its data is unreliable for some
// cards — if its "now" price is wildly higher than the real TCGplayer market, drop
// the trend rather than show a misleading chart.
export function getPriceTrend(card) {
  const cm = card?.cardmarket?.prices;
  if (!cm) return null;
  const tp = card?.tcgplayer?.prices;
  let tpMarket = 0;
  if (tp) {
    for (const k of Object.keys(tp)) {
      const m = tp[k]?.market;
      if (m > 0 && (tpMarket === 0 || m < tpMarket)) tpMarket = m;
    }
  }
  const now = cm.averageSellPrice || cm.trendPrice || 0;
  if (tpMarket > 0 && now > tpMarket * 5) return null;
  const pts = [
    { label: "30d", price: cm.avg30 },
    { label: "7d", price: cm.avg7 },
    { label: "1d", price: cm.avg1 },
    { label: "Now", price: now },
  ].filter((p) => p.price && p.price > 0);
  return pts.length >= 2 ? pts : null;
}

function categorizeByRarity(cards) {
  const b = { common: [], uncommon: [], rare: [], holo: [], illus: [], ultra: [], sar: [], secret: [] };
  for (const c of cards) {
    const r = (c.rarity || "").toLowerCase();
    if (r.includes("secret") || r.includes("rainbow")) b.secret.push(c);
    else if (r.includes("special illustration") || r.includes("special illus")) b.sar.push(c);
    else if (r.includes("ultra") || r.includes("vmax") || r.includes("vstar") || r === "v" || r.endsWith(" ex") || r.endsWith(" gx") || r.includes("ace spec")) b.ultra.push(c);
    else if (r.includes("illustration") || r.includes("special")) b.illus.push(c);
    else if (r.includes("holo") || r.includes("reverse") || r.includes("shiny") || r.includes("shining") || r.includes("prism")) b.holo.push(c);
    else if (r.includes("rare")) b.rare.push(c);
    else if (r.includes("uncommon")) b.uncommon.push(c);
    else b.common.push(c);
  }
  return b;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Builds a 10-card pack in legit reveal order: commons → uncommons → reverse →
// rare/hit. Hit odds follow community-documented SV-era pull rates:
//   Secret Rare ~1/200 · Special Illustration ~1/65 · Ultra Rare ~1/12 ·
//   Illustration Rare ~1/20 · Holo Rare ~1/4 · Plain Rare the rest.
// (Sources: pullmarket.io, dripshop.live, tcgplayer pull-rate studies.)
export function buildPack(setCards) {
  const b = categorizeByRarity(setCards);
  const pool = (arr) => (arr.length ? arr : setCards);
  const pack = [];
  for (let i = 0; i < 5; i++) pack.push(pick(pool(b.common)));        // bulk commons
  for (let i = 0; i < 3; i++) pack.push(pick(pool(b.uncommon)));      // uncommons
  const revPool = [...b.common, ...b.uncommon];
  pack.push(revPool.length ? pick(revPool) : pick(pool(b.rare)));      // reverse holo
  const roll = Math.random();                                         // rare / hit slot
  let slot;
  if (roll < 0.005 && b.secret.length) slot = pick(b.secret);          // ~1 in 200
  else if (roll < 0.02 && b.sar.length) slot = pick(b.sar);            // ~1 in 65
  else if (roll < 0.10 && b.ultra.length) slot = pick(b.ultra);         // ~1 in 12
  else if (roll < 0.15 && b.illus.length) slot = pick(b.illus);         // ~1 in 20
  else if (roll < 0.40 && b.holo.length) slot = pick(b.holo);          // ~1 in 4
  else slot = pick(pool(b.rare.length ? b.rare : b.holo.length ? b.holo : b.uncommon)); // plain rare
  pack.push(slot);
  return pack; // ordered: commons → uncommons → reverse → rare/hit (climax last)
}

// Top 5 most valuable cards in the set — pulling one triggers a celebration.
export function getChaseCardIds(setCards) {
  const sorted = [...setCards]
    .map((c) => ({ id: c.id, price: getCardPrice(c) }))
    .sort((a, b) => b.price - a.price);
  return new Set(sorted.slice(0, 5).filter((x) => x.price > 0).map((x) => x.id));
}

// Refresh market prices for a batch of cards (used by the Binder's "Refresh Prices").
// Fetches with limited concurrency and respects the per-card cache.
// Falls back to TCGPlayer via tcgwatchtower.com for cards where the Pokémon TCG
// API has no price data (common for very new or niche sets like Pitch Black).
export async function fetchCardPrices(cardIds, concurrency = 4) {
  const results = {};
  const queue = [...new Set((cardIds || []).filter(Boolean))];
  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      try {
        const card = await getCard(id);
        if (card) results[id] = getCardPrice(card);
      } catch {}
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Fallback: for cards still unpriced, fetch from TCGPlayer via the
  // tcgwatchtower backend function, grouped by set (one call per set).
  const unpriced = [...new Set((cardIds || []).filter(Boolean))].filter(
    (id) => !results[id] || results[id] === 0
  );
  if (unpriced.length === 0) return results;

  const bySet = {};
  for (const id of unpriced) {
    const setId = id.replace(/-\d+$/, "");
    (bySet[setId] ||= []).push(id);
  }

  const { base44 } = await import("@/api/base44Client");
  await Promise.all(
    Object.entries(bySet).map(async ([setId, ids]) => {
      try {
        const res = await base44.functions.invoke("fetchTcgplayerPrices", { set_id: setId });
        const fp = res?.data?.prices || {};
        for (const id of ids) if (fp[id] > 0) results[id] = fp[id];
      } catch {}
    })
  );

  return results;
}