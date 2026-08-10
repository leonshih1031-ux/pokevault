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

// Trailing-30-day percent change from cardmarket rolling averages.
// `now` = averageSellPrice (or trendPrice fallback); baseline = avg30.
// Returns null when cardmarket data is missing or unusable.
export function getCardMarketTrendPct(card) {
  const cm = card?.cardmarket?.prices;
  if (!cm) return null;
  const now = cm.averageSellPrice || cm.trendPrice || 0;
  const base = cm.avg30 || 0;
  if (now <= 0 || base <= 0) return null;
  return (now / base - 1) * 100;
}

export async function fetchCard(id) {
  const url = `https://api.pokemontcg.io/v2/cards/${id}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
      // 429 / 5xx: back off and retry. 4xx (non-429): no point retrying.
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  return null;
}