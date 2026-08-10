import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getCardPrice, getCardMarketTrendPct, fetchCard } from "../../shared/cardPrice.ts";

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

    // Index today's existing snapshots so we can update them in place
    // (e.g. backfill pct_30d) instead of creating duplicates.
    const existing = await base44.asServiceRole.entities.CardPriceHistory.filter({ snapshot_date: today }, "-snapshot_date", 200);
    const existingByCard = new Map((existing || []).map((h) => [h.card_id, h]));

    let recorded = 0, updated = 0, failed = 0;
    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        const card = await fetchCard(id);
        const price = getCardPrice(card);
        const pct = getCardMarketTrendPct(card);
        const m = meta[id];
        try {
          const prev = existingByCard.get(id);
          if (prev) {
            await base44.asServiceRole.entities.CardPriceHistory.update(prev.id, {
              price, pct_30d: pct,
              name: m?.name || card?.name || prev.name || "",
              image_small: m?.image_small || card?.images?.small || prev.image_small || "",
              set_id: m?.set_id || card?.set?.id || prev.set_id || "",
              set_name: m?.set_name || card?.set?.name || prev.set_name || "",
            });
            updated++;
          } else {
            await base44.asServiceRole.entities.CardPriceHistory.create({
              card_id: id, name: m?.name || card?.name || "",
              image_small: m?.image_small || card?.images?.small || "",
              set_id: m?.set_id || card?.set?.id || "", set_name: m?.set_name || card?.set?.name || "",
              price, pct_30d: pct, snapshot_date: today
            });
            recorded++;
          }
        } catch { failed++; }
      }
    }
    // Only process cards that either have no snapshot today or lack pct_30d.
    const queue = ids.filter((id) => {
      const prev = existingByCard.get(id);
      return !prev || prev.pct_30d == null;
    });
    await Promise.all(Array.from({ length: 4 }, worker));

    return Response.json({ recorded, updated, failed, tracked: ids.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}