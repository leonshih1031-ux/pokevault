import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let userId = null;
    try {
      const body = await req.json();
      userId = body?.user_id;
    } catch {}
    if (!userId) return Response.json({ error: 'Missing user_id' }, { status: 400 });

    const user = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
    if (!user) return Response.json({ error: 'Collector not found' }, { status: 404 });
    if (!user.public_profile) return Response.json({ error: 'This binder is private' }, { status: 403 });

    const cards = await base44.asServiceRole.entities.CollectionCard.filter({ created_by_id: userId }, "-updated_date", 500);

    const qty = cards.reduce((s, c) => s + (c.quantity || 1), 0);
    const value = cards.reduce((s, c) => s + (c.current_price || 0) * (c.quantity || 1), 0);
    const cost = cards.reduce((s, c) => s + (c.purchase_price || 0) * (c.quantity || 1), 0);
    const uniqueSets = new Set(cards.map((c) => c.set_id).filter(Boolean)).size;
    const top = [...cards]
      .map((c) => ({ name: c.name, value: (c.current_price || 0) * (c.quantity || 1), image_small: c.image_small, rarity: c.rarity }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return Response.json({
      user: { id: user.id, display_name: user.display_name || user.full_name || 'Collector', bio: user.bio || '' },
      cards: cards.map((c) => ({
        id: c.id, name: c.name, set_id: c.set_id, set_name: c.set_name, number: c.number,
        image_small: c.image_small, image_large: c.image_large, rarity: c.rarity,
        quantity: c.quantity, condition: c.condition, current_price: c.current_price
      })),
      stats: { qty, value, cost, uniqueSets, top }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}