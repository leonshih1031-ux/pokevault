import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getCardPrice, fetchCard } from "../../shared/cardPrice.ts";

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

    // Skip cards already snapshotted today.
    const existing = await base44.asServiceRole.entities.CardPriceHistory.filter({ snapshot_date: today }, "-snapshot_date", 200);
    const done = new Set((existing || []).map((h) => h.card_id));
    const queue = ids.filter((id) => !done.has(id));

    let recorded = 0, failed = 0;
    async function worker() {
      while (queue.length) {
        const id = queue.shift();
        const card = await fetchCard(id);
        const price = getCardPrice(card);
        const m = meta[id];
        try {
          await base44.asServiceRole.entities.CardPriceHistory.create({
            card_id: id, name: m?.name || card?.name || "",
            image_small: m?.image_small || card?.images?.small || "",
            set_id: m?.set_id || card?.set?.id || "", set_name: m?.set_name || card?.set?.name || "",
            price, snapshot_date: today
          });
          recorded++;
        } catch { failed++; }
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker));

    return Response.json({ recorded, failed, tracked: ids.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}