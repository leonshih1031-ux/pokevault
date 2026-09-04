import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_url, listing_name, listing_set, listing_number, listing_rarity, listing_condition } = body;
    if (!file_url || typeof file_url !== 'string') return Response.json({ error: 'file_url required' }, { status: 400 });

    const prompt = `You are a Pokémon TCG authentication expert helping prevent marketplace scams. A buyer photographed a card they received and wants to verify it matches the listing they paid for. Compare the photographed card against the listing details below.

LISTING DETAILS (what the seller claimed):
- Card name: ${listing_name || 'unknown'}
- Set / expansion: ${listing_set || 'unknown'}
- Collector number: ${listing_number || 'unknown'}
- Rarity: ${listing_rarity || 'unknown'}
- Listed condition: ${listing_condition || 'unknown'}

Examine the photo carefully. Read the card name (top-left), set symbol and set name (bottom-left), collector number (bottom-right), and assess the card's physical condition (corner wear, surface scratches, centering, holo pattern). Then return structured JSON comparing the photo to the listing.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        "properties": {
          "identified_name": { "type": "string" },
          "identified_set": { "type": "string" },
          "identified_number": { "type": "string" },
          "identified_rarity": { "type": "string" },
          "name_match": { "type": "boolean" },
          "set_match": { "type": "boolean" },
          "number_match": { "type": "boolean" },
          "condition_assessment": { "type": "string" },
          "condition_matches_listing": { "type": "boolean" },
          "overall_match": { "type": "boolean" },
          "confidence": { "type": "number" },
          "notes": { "type": "string" }
        },
        "required": ["overall_match", "confidence"]
      }
    });

    return Response.json({ verification: result });
  } catch (error) {
    console.error('verifyCardScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}