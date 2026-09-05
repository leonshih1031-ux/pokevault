// Stripe webhook handler — receives events from Stripe and updates the app.
//   checkout.session.completed → marks order as paid, transfers funds to each
//   seller's connected Stripe account, and marks purchased listings as sold.
//
// Endpoint: https://free-pokevault-collect-pro.base44.app/functions/stripeWebhook

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function verifyWebhookSignature(body, signatureHeader, secret) {
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signatureParts = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestampPart || signatureParts.length === 0) return false;

  const timestamp = timestampPart.slice(2);
  const signedPayload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expected = Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  return signatureParts.includes(expected);
}

export default async function(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!signature || !secret) return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });

    const valid = await verifyWebhookSignature(body, signature, secret);
    if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 401 });

    const event = JSON.parse(body);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const orderId = session?.metadata?.order_id;
      if (!orderId) return Response.json({ received: true });

      const base44 = createClientFromRequest(req);
      const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
      const appId = Deno.env.get('BASE44_APP_ID');

      // Idempotency: if the order is already paid, this is a duplicate webhook
      // delivery from Stripe — skip transfers and listing updates to avoid
      // double-paying sellers.
      const existingOrder = await base44.asServiceRole.entities.Order.get(orderId);
      if (existingOrder?.status === 'paid' || existingOrder?.status === 'shipped' || existingOrder?.status === 'delivered') {
        return Response.json({ received: true, duplicate: true });
      }

      // Update order status to paid
      await base44.asServiceRole.entities.Order.update(orderId, { status: 'paid' });

      // Get order items to calculate per-seller transfer amounts
      const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: orderId });
      const sellerTotals = {};
      for (const item of orderItems) {
        const cardPrice = Math.round((item.asking_price || 0) * 100);
        const platformFee = Math.round((cardPrice * (item.platform_fee || 3)) / 100);
        const sellerGets = cardPrice - platformFee;
        sellerTotals[item.seller_id] = (sellerTotals[item.seller_id] || 0) + sellerGets;
      }

      // Create transfers to each seller's connected account
      for (const [sellerId, amount] of Object.entries(sellerTotals)) {
        if (amount <= 0) continue;
        const seller = await base44.asServiceRole.entities.User.get(sellerId);
        if (!seller?.seller_stripe_account_id) continue;
        try {
          const tp = new URLSearchParams();
          tp.append('amount', String(amount));
          tp.append('currency', 'usd');
          tp.append('destination', seller.seller_stripe_account_id);
          tp.append('transfer_group', orderId);
          tp.append('metadata[order_id]', orderId);
          tp.append('metadata[base44_app_id]', appId || '');

          const tRes = await fetch('https://api.stripe.com/v1/transfers', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Stripe-Version': '2025-10-29.clover',
              'Idempotency-Key': crypto.randomUUID(),
            },
            body: tp,
          });
          if (!tRes.ok) {
            const tErr = await tRes.json();
            console.error('Transfer failed for seller', sellerId, tErr.error?.message);
          }
        } catch (e) {
          console.error('Transfer error for seller', sellerId, e);
        }
      }

      // Mark all purchased listings as sold
      for (const item of orderItems) {
        if (item.listing_id) {
          await base44.asServiceRole.entities.MarketplaceListing.update(item.listing_id, { status: 'sold' });
        }
      }

      console.log(`Order ${orderId} paid — ${orderItems.length} items, transfers created for ${Object.keys(sellerTotals).length} seller(s)`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}