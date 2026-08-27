// Stripe webhook handler — receives events from Stripe and updates the app
// state accordingly. Currently handles:
//   checkout.session.completed → marks the purchased listing as "sold"
//
// The endpoint URL is: https://free-pokevault-collect-pro.base44.app/functions/stripeWebhook

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

async function verifyWebhookSignature(body: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signatureParts = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));

  if (!timestampPart || signatureParts.length === 0) return false;

  const timestamp = timestampPart.slice(2);
  const signedPayload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Reject requests older than 5 minutes.
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  return signatureParts.includes(expectedSignature);
}

export default async function(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !secret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const valid = await verifyWebhookSignature(body, signature, secret);
    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const listingId = session?.metadata?.listing_id;

      if (listingId) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.MarketplaceListing.update(listingId, {
          status: 'sold',
        });
        console.log(`Listing ${listingId} marked as sold after payment ${session.id}`);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}