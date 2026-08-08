import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const prompt = `Find the latest Pokémon Trading Card Game news and articles from the last 2 weeks. Focus on: new set releases and reveal dates, banlist or rule changes, notable card price movements, major tournament results, and official Pokémon Company announcements. Return the 8 most notable real articles as JSON, each with: title, summary (2 concise sentences), source (publication/site name), url, and date (ISO 8601 if available). Only include real, verifiable articles — do not fabricate items or URLs.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          articles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                source: { type: "string" },
                url: { type: "string" },
                date: { type: "string" }
              },
              required: ["title", "summary"]
            }
          }
        },
        required: ["articles"]
      }
    });

    return Response.json({ articles: result.articles || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}