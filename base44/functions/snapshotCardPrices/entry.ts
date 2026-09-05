import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getCardPrice, getCardMarketTrendPct, fetchSetCards, fetchCard } from "../../shared/cardPrice.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date().toISOString().slice(0, 10);

    // Gather unique tracked card ids + metadata across all users.
    const [col, wish, alerts] = await Promise.all([
      base44.asServiceRole.entities.CollectionCard.list("-updated_date", 500),
      base44.asServiceRole.entities.WishlistItem.list("-created_date", 500),
      base44.asServiceRole.entities.PriceAlert.list("-created_date", 500),
    ]);
    const meta = {};
    const add = (c) => { if (c?.card_id && !meta[c.card_id]) meta[c.card_id] = { name: c.name, image_small: c.image_small, set_id: c.set_id, set_name: c.set_name }; };
    col.forEach(add); wish.forEach(add); alerts.forEach(add);

    const ids = Object.keys(meta).slice(0, 150);

    // Index today's existing snapshots so we can update them in place.
    const existing = await base44.asServiceRole.entities.CardPriceHistory.filter({ snapshot_date: today }, "-snapshot_date", 200);
    const existingByCard = new Map((existing || []).map((h) => [h.card_id, h]));

    // Only process cards that still lack a usable snapshot today (no price or
    // no rarity). A null pct_30d is fine — it just means cardmarket has no
    // trend data for that card, and re-fetching won't change that.
    const needed = ids.filter((id) => {
      const prev = existingByCard.get(id);
      return !prev || !prev.price || !prev.rarity;
    });

    if (needed.length === 0) {
      return Response.json({ recorded: 0, updated: 0, failed: 0, tracked: ids.length, sets: 0 });
    }

    // --- Phase 1: Batch fetch by set (a few paginated calls covers all tracked
    // cards in a set, vs one call per card). ---
    const bySet = {};
    for (const id of needed) {
      const setId = meta[id]?.set_id || id.replace(/-\d+$/, "");
      (bySet[setId] ||= []).push(id);
    }
    const setIds = Object.keys(bySet);

    const priceData = {}; // card_id -> { price, pct, card }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    const setQueue = [...setIds];
    async function setWorker() {
      while (setQueue.length) {
        const setId = setQueue.shift();
        try {
          const cards = await fetchSetCards(setId);
          for (const card of cards) {
            if (bySet[setId].includes(card.id)) {
              priceData[card.id] = { price: getCardPrice(card), pct: getCardMarketTrendPct(card), card };
            }
          }
        } catch { /* set fetch failed — fallback below */ }
        await sleep(200);
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, setIds.length) }, setWorker));

    // --- Phase 2: Fallback to individual card fetches for any cards the set
    // batch missed (set returned 500, card on a later page, etc.). Uses
    // limited concurrency and pacing to respect API rate limits.
    // Circuit breaker: if ALL set fetches returned 0 cards, the API is likely
    // down (502/429) — skip individual fetches since they'll also fail, saving
    // ~4 minutes of pointless retries. Failed cards retry on the next run. ---
    const stragglers = needed.filter((id) => !priceData[id]);
    const apiLikelyDown = setIds.length > 0 && Object.keys(priceData).length === 0;
    if (stragglers.length > 0 && !apiLikelyDown) {
      const cardQueue = [...stragglers];
      async function cardWorker() {
        while (cardQueue.length) {
          const id = cardQueue.shift();
          try {
            const card = await fetchCard(id);
            if (card) priceData[id] = { price: getCardPrice(card), pct: getCardMarketTrendPct(card), card };
          } catch { /* individual fetch failed — retries next run */ }
          await sleep(200);
        }
      }
      await Promise.all(Array.from({ length: Math.min(4, stragglers.length) }, cardWorker));
    }

    // Build batch update/create arrays.
    const toUpdate = [];
    const toCreate = [];
    let failed = 0;
    for (const id of needed) {
      const pd = priceData[id];
      if (!pd) { failed++; continue; }
      const m = meta[id];
      const prev = existingByCard.get(id);
      const fields = {
        price: pd.price,
        pct_30d: pd.pct,
        name: m?.name || pd.card?.name || "",
        image_small: m?.image_small || pd.card?.images?.small || "",
        set_id: m?.set_id || pd.card?.set?.id || "",
        set_name: m?.set_name || pd.card?.set?.name || "",
        rarity: pd.card?.rarity || "",
      };
      if (prev) {
        toUpdate.push({ id: prev.id, ...fields });
      } else {
        toCreate.push({ card_id: id, ...fields, snapshot_date: today });
      }
    }

    // Bulk DB writes — one call each instead of N per-card calls.
    let updated = 0, recorded = 0;
    if (toUpdate.length) {
      try { await base44.asServiceRole.entities.CardPriceHistory.bulkUpdate(toUpdate); updated = toUpdate.length; } catch { failed += toUpdate.length; }
    }
    if (toCreate.length) {
      try { await base44.asServiceRole.entities.CardPriceHistory.bulkCreate(toCreate); recorded = toCreate.length; } catch { failed += toCreate.length; }
    }

    return Response.json({ recorded, updated, failed, tracked: ids.length, sets: setIds.length, stragglers: stragglers.length, api_down: apiLikelyDown });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}