import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body.file_url;
    if (!fileUrl || typeof fileUrl !== 'string') return Response.json({ error: 'file_url required' }, { status: 400 });

    const prompt = `You are a Pokémon TCG card identification expert. Examine the uploaded image of a Pokémon trading card. Read carefully: the card name (usually top-left), the expansion/set name and set symbol (bottom-left), the collector number (bottom-right, e.g. "12/099"), and the rarity. Return structured JSON with: name (exact card name as printed), set_name (expansion set name), number (collector number, e.g. "12/099" or "12"), rarity (one of: Common, Uncommon, Rare, Rare Holo, Rare Ultra, Illustration Rare, Special Illustration Rare, Rare Secret, Promo, Amazing Rare), and confidence (0 to 1). If the image is not a Pokémon card or you cannot identify it, set name to null and confidence low.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          set_name: { type: "string" },
          number: { type: "string" },
          rarity: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["name"]
      }
    });

    return Response.json({ identity: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}