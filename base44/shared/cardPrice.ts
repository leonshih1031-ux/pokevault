// Shared card-price logic used by backend functions (Deno runtime).
// Mirrors the client getCardPrice in src/lib/pokemonApi.js — keep them in sync.

export function getCardPrice(card) {
  if (!card) return 0;
  const tp = card.tcgplayer?.prices;
  if (tp) {
    let minMarket = 0, minLow = 0;
    for (const k of Object.keys(tp)) {
      const m = tp[k]?.market;
      if (m > 0 && (minMarket === 0 || m < minMarket)) minMarket = m;
      const l = tp[k]?.low;
      if (l > 0 && (minLow === 0 || l < minLow)) minLow = l;
    }
    if (minMarket > 0) return minMarket;
    if (minLow > 0) return minLow;
  }
  const cm = card.cardmarket?.prices;
  if (cm) {
    if (cm.averageSellPrice > 0) return cm.averageSellPrice;
    if (cm.trendPrice > 0) return cm.trendPrice;
  }
  return 0;
}

export async function fetchCard(id) {
  try {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch { return null; }
}