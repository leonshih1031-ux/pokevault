// Fallback price source: when the Pokémon TCG API has no tcgplayer.prices
// for a card (common for very new or niche sets), fetch live TCGPlayer
// market prices via tcgwatchtower.com's price API.
//
// Input:  { set_id: "me5" }
// Output:  { prices: { "me5-41": 0.07, "me5-27": 0.55, ... }, source: "tcgwatchtower" }

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const setId = body?.set_id;
    if (!setId) return Response.json({ error: 'set_id is required' }, { status: 400 });

    // tcgwatchtower uses zero-padded set IDs (me05, sv03) while the Pokémon TCG
    // API uses unpadded ones (me5, sv3). Normalize by padding the numeric suffix.
    const normalizedId = setId.replace(/(\d+)$/, (m) => m.padStart(2, '0'));

    // 1. Fetch the sets list to find the slug for this set.
    const setsRes = await fetch('https://tcgwatchtower.com/sets.json', {
      headers: { Accept: 'application/json' },
    });
    if (!setsRes.ok) return Response.json({ error: `Sets API returned ${setsRes.status}` }, { status: 502 });
    const setsData = await setsRes.json();
    const sets = Array.isArray(setsData) ? setsData : (setsData.sets || setsData);
    const setEntry = sets.find((s) => s.setId === normalizedId || s.setId === setId);
    if (!setEntry) return Response.json({ prices: {}, source: 'tcgwatchtower', note: 'set not found' });

    // 2. Fetch the set page to extract the TCGPlayer group ID.
    const pageUrl = `https://tcgwatchtower.com/${setEntry.slug}`;
    const pageRes = await fetch(pageUrl);
    if (!pageRes.ok) return Response.json({ prices: {}, source: 'tcgwatchtower', note: `page returned ${pageRes.status}` });
    const html = await pageRes.text();
    const groupMatch = html.match(/TCGP_GROUP_ID\s*=\s*['"]?(\d+)['"]?/);
    if (!groupMatch) return Response.json({ prices: {}, source: 'tcgwatchtower', note: 'groupId not found' });
    const groupId = groupMatch[1];

    // 3. Fetch the prices from the TCGPlayer prices API.
    const pricesRes = await fetch(`https://tcgwatchtower.com/api/tcgplayer-prices?groupId=${groupId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!pricesRes.ok) return Response.json({ prices: {}, source: 'tcgwatchtower', note: `prices API returned ${pricesRes.status}` });
    const pricesData = await pricesRes.json();
    const rawPrices = pricesData.prices || {};

    // 4. Map zero-padded card numbers back to Pokémon TCG API card IDs.
    //    tcgwatchtower keys: "041" → Pokémon TCG API: "me5-41"
    const prices = {};
    for (const [num, price] of Object.entries(rawPrices)) {
      if (price > 0) prices[`${setId}-${parseInt(num, 10)}`] = price;
    }

    return Response.json({ prices, source: 'tcgwatchtower', count: Object.keys(prices).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}