// Creates a Stripe Connect Express account for the seller and returns an
// onboarding link. Called when a seller clicks "Connect Stripe to receive
// payouts" on the Marketplace page.
//
// Output: { url: string, account_id: string }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appId = Deno.env.get('BASE44_APP_ID');
    const origin = req.headers.get('origin') || 'https://free-pokevault-collect-pro.base44.app';

    let accountId = user.seller_stripe_account_id;

    // Create a new Express account if the seller doesn't have one yet.
    if (!accountId) {
      const params = new URLSearchParams();
      params.append('type', 'express');
      params.append('metadata[base44_app_id]', appId || '');
      params.append('metadata[user_id]', user.id);

      const res = await fetch('https://api.stripe.com/v1/accounts', {
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
        console.error('Stripe account create error:', err);
        return Response.json({ error: err.error?.message || 'Failed to create Stripe account' }, { status: 400 });
      }
      const account = await res.json();
      accountId = account.id;

      // Persist the account ID on the user record.
      await base44.auth.updateMe({ seller_stripe_account_id: accountId });
    }

    // Generate an onboarding link (works for both new and existing accounts).
    const linkParams = new URLSearchParams();
    linkParams.append('account', accountId);
    linkParams.append('type', 'account_onboarding');
    linkParams.append('return_url', `${origin}/marketplace`);
    linkParams.append('refresh_url', `${origin}/marketplace`);

    const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-10-29.clover',
      },
      body: linkParams,
    });
    if (!linkRes.ok) {
      const err = await linkRes.json();
      console.error('Stripe account link error:', err);
      return Response.json({ error: err.error?.message || 'Failed to create onboarding link' }, { status: 400 });
    }
    const link = await linkRes.json();

    return Response.json({ url: link.url, account_id: accountId });
  } catch (error) {
    console.error('createSellerStripeAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}