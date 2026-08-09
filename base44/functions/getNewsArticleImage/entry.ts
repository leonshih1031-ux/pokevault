import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const url = (body.url || '').toString();
    if (!url || !/^https?:\/\//i.test(url)) return Response.json({ image_url: '' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let html = '';
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml' },
        signal: controller.signal,
        redirect: 'follow'
      });
      html = await resp.text();
    } catch { /* ignore fetch failures */ }
    finally { clearTimeout(timeout); }

    if (!html) return Response.json({ image_url: '' });

    const pick = (re) => {
      const m = html.match(re);
      return m && m[1] ? m[1] : null;
    };
    let image = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
      || pick(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);

    if (image) {
      if (image.startsWith('//')) image = 'https:' + image;
      else if (image.startsWith('/')) {
        try { image = new URL(image, url).href; } catch { image = ''; }
      }
    }

    return Response.json({ image_url: image || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}