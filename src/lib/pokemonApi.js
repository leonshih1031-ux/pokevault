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

export async function getSets() {
  const res = await fetch(`${BASE}/sets?orderBy=-releaseDate&pageSize=100`);
  if (!res.ok) throw new Error("Failed to load sets");
  const json = await res.json();
  return json.data;
}

export async function getCard(id) {
  const res = await fetch(`${BASE}/cards/${id}`);
  if (!res.ok) throw new Error("Failed to load card");
  const json = await res.json();
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
  const res = await fetch(`${BASE}/cards?${params.toString()}`);
  if (!res.ok) {
    if (res.status === 400) return { cards: [], totalCount: 0, page };
    throw new Error("Search failed");
  }
  const json = await res.json();
  return { cards: json.data || [], totalCount: json.totalCount || 0, page, pageSize };
}

export async function getSetCards(setId) {
  let all = [];
  let page = 1;
  let totalCount = Infinity;
  while (all.length < totalCount && page <= 4) {
    const params = new URLSearchParams();
    params.set("q", `set.id:${setId}`);
    params.set("page", String(page));
    params.set("pageSize", "250");
    const res = await fetch(`${BASE}/cards?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load set cards");
    const json = await res.json();
    totalCount = json.totalCount || 0;
    all = all.concat(json.data || []);
    if (!json.data || json.data.length < 250) break;
    page++;
  }
  return all;
}

export function getCardPrice(card) {
  if (!card) return 0;
  const cm = card.cardmarket?.prices;
  if (cm?.averageSellPrice) return cm.averageSellPrice;
  const tp = card.tcgplayer?.prices;
  if (tp) {
    for (const k of Object.keys(tp)) {
      if (tp[k]?.market) return tp[k].market;
    }
  }
  return 0;
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
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export function buildPack(setCards) {
  const b = categorizeByRarity(setCards);
  const pool = (arr) => (arr.length ? arr : setCards);
  const pack = [];
  for (let i = 0; i < 5; i++) pack.push(pick(pool(b.common)));
  for (let i = 0; i < 3; i++) pack.push(pick(pool(b.uncommon)));
  pack.push(pick(pool(b.rare.length ? b.rare : b.uncommon)));
  const revPool = [...b.common, ...b.uncommon];
  if (revPool.length) pack.push(pick(revPool));
  const hitRoll = Math.random();
  let hit;
  if (hitRoll < 0.06 && b.secret.length) hit = pick(b.secret);
  else if (hitRoll < 0.22 && b.ultra.length) hit = pick(b.ultra);
  else if (hitRoll < 0.5 && b.holo.length) hit = pick(b.holo);
  else hit = pick(pool(b.rare.length ? b.rare : b.common));
  pack.push(hit);
  return shuffle(pack).slice(0, 11);
}