import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function extractMeta(html, re) {
  const m = html.match(re);
  return m && m[1] ? m[1].trim() : null;
}
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
function absUrl(src, base) {
  if (!src) return '';
  if (src.startsWith('//')) return 'https:' + src;
  if (src.startsWith('/')) { try { return new URL(src, base).href; } catch { return ''; } }
  if (/^https?:/i.test(src)) return src;
  return '';
}
async function fetchPage(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      redirect: 'follow'
    });
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;
    return await resp.text();
  } catch { return null; }
  finally { clearTimeout(t); }
}
function parseArticle(url, html) {
  const title = extractMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
    || extractMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
  const summary = extractMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  let image = extractMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    || extractMeta(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i);
  if (!image) {
    const tags = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
    for (const tag of tags) {
      const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1];
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;
      if (/logo|icon|avatar|sprite|favicon|spacer|pixel|tracker/i.test(src)) continue;
      const abs = absUrl(src, url);
      if (abs) { image = abs; break; }
    }
  } else {
    image = absUrl(image, url);
  }
  const source = extractMeta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const date = extractMeta(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)
    || extractMeta(html, /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i);
  return {
    title: decodeEntities(title || ''),
    summary: decodeEntities(summary || ''),
    source: decodeEntities(source || ''),
    url,
    date: date || '',
    image_url: image || ''
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const prompt = `Find the latest Pokémon Trading Card Game news from the last 2 weeks. Search for real, recent articles about: new set releases and reveal dates, banlist or rule changes, notable card price movements, major tournament results, and official Pokémon Company announcements. Return the 12 most notable REAL article URLs you actually found via search. Each URL MUST be the URL of a specific article page (NOT a homepage, category index, tag page, or search results page), and every URL MUST be distinct. For each, include a 2-3 word topic label. Do NOT fabricate or guess URLs — only return URLs you verified exist.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                topic: { type: "string" }
              },
              required: ["url"]
            }
          }
        },
        required: ["items"]
      }
    });

    const seen = new Set();
    const urls = (result.items || [])
      .map(it => (it.url || '').toString().trim().split('?')[0].replace(/\/$/, ''))
      .filter(u => /^https?:\/\//i.test(u) && !seen.has(u) && seen.add(u))
      .slice(0, 12);

    const pages = await Promise.all(urls.map(u => fetchPage(u).then(html => html ? parseArticle(u, html) : null)));
    const isJunk = (t) => !t || /page not found|^not found$|^404|access denied|forbidden|^error$/i.test(t);
    const articles = pages.filter(p => p && p.title && p.summary && !isJunk(p.title)).slice(0, 8);

    return Response.json({ articles });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}