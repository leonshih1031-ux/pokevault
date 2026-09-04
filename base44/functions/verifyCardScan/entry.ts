import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_url, listing_name, listing_set, listing_number, listing_rarity, listing_condition } = body;
    if (!file_url || typeof file_url !== 'string') return Response.json({ error: 'file_url required' }, { status: 400 });

    // Step 1: Internet image detection — a real photo of a physical card should NOT be findable online.
    // Use web search + vision to check if the uploaded image is a stock/render from TCG databases or marketplaces.
    const internetCheckPrompt = `You are an anti-scam analyst for a Pokémon TCG marketplace. You are given an image that a user uploaded as "proof" of a physical card. Determine whether this image is a REAL PHOTOGRAPH of a physical card, or a DIGITAL STOCK IMAGE sourced from the internet (TCG price databases, official card scans, eBay/TCGplayer listings, product renders, etc.).

Look for these signals:
- REAL PHOTO signals: uneven lighting, reflections/glare on the card surface, background surface (table, mat, hand), slight rotation or perspective distortion, visible card edges/thickness, camera noise, imperfect framing.
- INTERNET STOCK signals: perfectly cropped, uniform digital rendering, no background, no glare, no perspective distortion, appears identical to official TCG database scans or product images.

Use web search to check if this exact image (or a visually identical one) appears on known Pokémon TCG sites (e.g. tcgplayer.com, pricecharting.com, pokemon.com, ebay.com, cardmarket.com). If the image matches a known online source, it is almost certainly NOT a real photo of the seller's own card.

Return structured JSON with your assessment.`;

    const internetResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: internetCheckPrompt,
      file_urls: [file_url],
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        "properties": {
          "is_internet_image": { "type": "boolean", "description": "True if the image appears to be sourced from the internet rather than a real photo of a physical card" },
          "internet_source_url": { "type": "string", "description": "URL where a matching image was found online, or empty string" },
          "internet_source_site": { "type": "string", "description": "Name of the site where a match was found (e.g. TCGplayer, eBay, PriceCharting), or empty string" },
          "real_photo_signals": { "type": "array", "items": { "type": "string" } },
          "stock_image_signals": { "type": "array", "items": { "type": "string" } },
          "internet_confidence": { "type": "number", "description": "0-1 confidence that this is an internet-sourced image" }
        },
        "required": ["is_internet_image", "internet_confidence"]
      }
    });

    // If the image is flagged as internet-sourced, immediately flag as a scam and skip card matching.
    if (internetResult.is_internet_image && internetResult.internet_confidence >= 0.7) {
      return Response.json({
        verification: {
          overall_match: false,
          confidence: 0,
          scam_flag: true,
          scam_reason: "INTERNET_IMAGE_DETECTED",
          scam_detail: `The uploaded image appears to be sourced from the internet${internetResult.internet_source_site ? ` (${internetResult.internet_source_site})` : ''} rather than a real photograph of a physical card. This is a strong indicator of a potential scam.`,
          internet_image_detected: true,
          internet_source_url: internetResult.internet_source_url || "",
          internet_source_site: internetResult.internet_source_site || "",
          internet_confidence: internetResult.internet_confidence,
          notes: "FLAGGED: Image matches an online source. A legitimate proof photo should be a real photo of the physical card in the seller's possession, not a digital stock image."
        }
      });
    }

    // Step 2: Card matching — only proceed if the image passed the internet check.
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

    // Merge internet check results into the final verification response.
    result.internet_image_detected = internetResult.is_internet_image || false;
    result.internet_confidence = internetResult.internet_confidence || 0;
    result.scam_flag = false;
    result.scam_reason = null;

    return Response.json({ verification: result });
  } catch (error) {
    console.error('verifyCardScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}