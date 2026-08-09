import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title = (body.title || '').toString().slice(0, 200);
    const summary = (body.summary || '').toString().slice(0, 400);
    if (!title) return Response.json({ error: 'title required' }, { status: 400 });

    const prompt = `Create a vivid, colorful promotional key-art illustration for a Pokémon Trading Card Game news article. Article title: "${title}". ${summary ? `Context: ${summary}.` : ''} Style: official Pokémon TCG booster-pack and set artwork aesthetic — dynamic Pokémon characters, energy, holographic foil textures, celebratory or reveal theme matching the article. No text, no words, no watermark, no logo. Square composition, high detail.`;

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    return Response.json({ url: result.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}