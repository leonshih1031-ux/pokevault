// Creates a Stripe Checkout session for buying one or more marketplace listings (cart).
// Creates a pending Order + OrderItems, then redirects to Stripe Checkout.
// After payment, the webhook marks the order as paid, transfers funds to each
// seller's connected Stripe account, and marks listings as sold.
//
// Input:  { listing_ids: string[], shipping: { name, email, country, address, city, state, postal_code, phone }, shipping_company: string, notes?: string }
// Output: { url: string, session_id: string, order_id: string }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const listingIds = body?.listing_ids;
    const shipping = body?.shipping;
    const shippingCompany = body?.shipping_company;

    if (!Array.isArray(listingIds) || listingIds.length === 0)
      return Response.json({ error: 'listing_ids is required' }, { status: 400 });
    if (!shipping?.country || !shipping?.address)
      return Response.json({ error: 'Shipping address is required' }, { status: 400 });
    if (!shippingCompany)
      return Response.json({ error: 'Shipping company is required' }, { status: 400 });

    // Fetch and validate all listings
    const listings = [];
    for (const id of listingIds) {
      const l = await base44.asServiceRole.entities.MarketplaceListing.get(id);
      if (!l || l.status !== 'active') continue;
      if (l.created_by_id === user.id) continue;
      listings.push(l);
    }
    if (listings.length === 0)
      return Response.json({ error: 'No valid listings to purchase' }, { status: 400 });

    // Verify all sellers have Stripe connected
    const sellerIds = [...new Set(listings.map((l) => l.created_by_id))];
    for (const sid of sellerIds) {
      const s = await base44.asServiceRole.entities.User.get(sid);
      if (!s?.seller_stripe_account_id)
        return Response.json({ error: 'One or more sellers have not connected Stripe for payouts' }, { status: 400 });
    }

    // Calculate totals (all in cents)
    let totalAmount = 0;
    let platformFeeTotal = 0;
    const orderItems = listings.map((l) => {
      const feePercent = l.platform_fee || 3;
      const cardPrice = Math.round((l.asking_price || 0) * 100);
      const platformFee = Math.round((cardPrice * feePercent) / 100);
      totalAmount += cardPrice + platformFee;
      platformFeeTotal += platformFee;
      return {
        listing_id: l.id,
        seller_id: l.created_by_id,
        card_name: l.name,
        card_image: l.image_small || l.image_large,
        set_name: l.set_name,
        number: l.number,
        asking_price: l.asking_price,
        platform_fee: feePercent,
        condition: l.condition,
        variant: l.variant,
        status: 'preparing',
      };
    });

    // Create pending Order
    const order = await base44.asServiceRole.entities.Order.create({
      buyer_name: shipping.name || '',
      buyer_email: shipping.email || '',
      shipping_country: shipping.country,
      shipping_address: shipping.address,
      shipping_city: shipping.city || '',
      shipping_state: shipping.state || '',
      shipping_postal_code: shipping.postal_code || '',
      shipping_phone: shipping.phone || '',
      shipping_company: shippingCompany,
      total_amount: totalAmount / 100,
      platform_fee_total: platformFeeTotal / 100,
      items_count: orderItems.length,
      status: 'pending_payment',
      notes: body?.notes || '',
    });

    // Create OrderItems
    for (const item of orderItems) {
      await base44.asServiceRole.entities.OrderItem.create({ ...item, order_id: order.id });
    }

    // Create Stripe Checkout session (platform collects, transfers done in webhook)
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = req.headers.get('origin') || 'https://free-pokevault-collect-pro.base44.app';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[0]', 'card');
    params.append('payment_intent_data[transfer_group]', order.id);

    listings.forEach((l, i) => {
      const feePercent = l.platform_fee || 3;
      const cardPrice = Math.round((l.asking_price || 0) * 100);
      const platformFee = Math.round((cardPrice * feePercent) / 100);
      const itemTotal = cardPrice + platformFee;
      params.append(`line_items[${i}][quantity]`, '1');
      params.append(`line_items[${i}][price_data][currency]`, 'usd');
      params.append(`line_items[${i}][price_data][unit_amount]`, String(itemTotal));
      params.append(`line_items[${i}][price_data][product_data][name]`, l.name);
      const desc = `${l.set_name || ''} · #${l.number || ''} · ${l.condition || ''}`.replace(/^ · | · $/g, '').trim();
      if (desc) params.append(`line_items[${i}][price_data][product_data][description]`, desc);
      if (l.image_small) params.append(`line_items[${i}][price_data][product_data][images][0]`, l.image_small);
    });

    params.append('metadata[base44_app_id]', appId || '');
    params.append('metadata[order_id]', order.id);
    params.append('success_url', `${origin}/orders?purchase=success&order=${order.id}`);
    params.append('cancel_url', `${origin}/orders?purchase=cancelled&order=${order.id}`);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-10-29.clover',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Stripe checkout create error:', err);
      await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' });
      return Response.json({ error: err.error?.message || 'Failed to create checkout session' }, { status: 400 });
    }

    const session = await res.json();
    await base44.asServiceRole.entities.Order.update(order.id, { stripe_session_id: session.id });

    return Response.json({ url: session.url, session_id: session.id, order_id: order.id });
  } catch (error) {
    console.error('createMarketplaceCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}