import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getCardPrice, fetchCard } from "../../shared/cardPrice.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const alerts = await base44.asServiceRole.entities.PriceAlert.filter({ triggered: false }, "-created_date", 500);
    let checked = 0, triggered = 0;
    for (const a of alerts) {
      const card = await fetchCard(a.card_id);
      if (!card) continue; // API failure — skip, retry next run (don't corrupt with price=0)
      const price = getCardPrice(card);
      if (!price || price <= 0) continue; // no price data available — skip
      const hit = a.direction === "below"
        ? price <= a.target_price
        : price >= a.target_price;
      await base44.asServiceRole.entities.PriceAlert.update(a.id, {
        last_price: price,
        last_checked: new Date().toISOString(),
        triggered: hit,
      });
      checked++;
      if (hit) {
        triggered++;
        try {
          const owner = await base44.asServiceRole.entities.User.get(a.created_by_id);
          if (owner?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: owner.email,
              subject: `Price alert triggered: ${a.name}`,
              body: `Your price alert for ${a.name} just triggered.\n\nTarget: ${a.direction === "below" ? "drops below" : "rises above"} $${Number(a.target_price).toFixed(2)}\nCurrent price: $${price.toFixed(2)}\n\nView your alerts in PokePortfolio.`
            });
          }
        } catch {}
      }
    }
    return Response.json({ checked, triggered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}