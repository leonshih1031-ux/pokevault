// Creates a Stripe Checkout session for buying a marketplace listing.
// Routes the payment through Stripe Connect: the buyer pays card price +
// platform fee, the platform retains the fee, and the seller receives the
// asking price minus the platform fee percentage.
//
// Input:  { listing_id: string }
// Output: { url: string, session_id: string }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const listingId = body?.listing_id;
    if (!listingId) return Response.json({ error: 'listing_id is required' }, { status: 400 });

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const listing = await base44.asServiceRole.entities.MarketplaceListing.get(listingId);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.status !== 'active') return Response.json({ error: 'Listing is no longer available' }, { status: 400 });
    if (listing.created_by_id === user.id) return Response.json({ error: 'You cannot buy your own listing' }, { status: 400 });

    // Fetch the seller's User record to get their Stripe Connect account ID.
    const seller = await base44.asServiceRole.entities.User.get(listing.created_by_id);
    if (!seller?.seller_stripe_account_id) {
      return Response.json({ error: 'Seller has not connected Stripe for payouts yet' }, { status: 400 });
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = req.headers.get('origin') || 'https://free-pokevault-collect-pro.base44.app';

    // Fee math (all in cents):
    //   cardPrice   = asking_price
    //   platformFee = cardPrice * (feePercent / 100)
    //   total       = cardPrice + platformFee        ← buyer pays this
    //   sellerGets  = cardPrice - platformFee        ← seller receives this
    //   appFee      = total - sellerGets = 2 * fee   ← platform retains this
    const feePercent = listing.platform_fee || 3;
    const cardPrice = Math.round((listing.asking_price || 0) * 100);
    const platformFee = Math.round(cardPrice * feePercent / 100);
    const totalAmount = cardPrice + platformFee;
    const sellerReceives = cardPrice - platformFee;
    const applicationFee = totalAmount - sellerReceives;

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[0]', 'card');
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(totalAmount));
    params.append('line_items[0][price_data][product_data][name]', listing.name);
    const desc = `${listing.set_name || ''} · #${listing.number || ''} · ${listing.condition || ''}`.replace(/^ · | · $/g, '').trim();
    if (desc) params.append('line_items[0][price_data][product_data][description]', desc);
    if (listing.image_small) params.append('line_items[0][price_data][product_data][images][0]', listing.image_small);
    params.append('transfer_data[destination]', seller.seller_stripe_account_id);
    params.append('application_fee_amount', String(applicationFee));
    params.append('metadata[base44_app_id]', appId || '');
    params.append('metadata[listing_id]', listing.id);
    params.append('metadata[seller_id]', listing.created_by_id);
    params.append('success_url', `${origin}/marketplace?purchase=success&listing=${listing.id}`);
    params.append('cancel_url', `${origin}/marketplace?purchase=cancelled&listing=${listing.id}`);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-10-29.clover',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Stripe checkout create error:', err);
      return Response.json({ error: err.error?.message || 'Failed to create checkout session' }, { status: 400 });
    }
    const session = await res.json();

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createMarketplaceCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}