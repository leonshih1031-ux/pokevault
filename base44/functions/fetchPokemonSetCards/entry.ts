// Fetches all cards for a Pokémon TCG set via the Pokémon TCG API.
// Running this server-side (rather than from the browser) helps with
// reliability: the server's IP is shared across all app users and is less
// likely to be rate-limited than individual client IPs. One server fetch
// benefits everyone via the client's 24h cache.
//
// Input:  { set_id: "sv3pt5" }
// Output: { cards: [...], set_id: "sv3pt5", count: 123 }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SET_EXTRAS = { swsh12pt5: ["swsh12pt5gg"] };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const setId = body?.set_id;
    if (!setId) return Response.json({ error: 'set_id is required' }, { status: 400 });

    const headers = { Accept: 'application/json' };
    const ids = [setId, ...(SET_EXTRAS[setId] || [])];
    let all = [];
    for (const id of ids) {
      for (let p = 1; p <= 6; p++) {
        const params = new URLSearchParams({ q: `set.id:${id}`, page: String(p), pageSize: '250' });
        let res;
        try {
          res = await fetch(`https://api.pokemontcg.io/v2/cards?${params}`, { headers });
        } catch { break; }
        if (!res.ok) break;
        const json = await res.json();
        if (!json.data || !json.data.length) break;
        all = all.concat(json.data);
        const total = json.totalCount || 0;
        if (p * 250 >= total) break;
      }
    }
    return Response.json({ cards: all, set_id: setId, count: all.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}