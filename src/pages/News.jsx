import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Newspaper, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Image } from "@/components/ui/image";

export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getPokemonNews", {});
      setArticles(res.data?.articles || []);
    } catch { toast({ title: "Could not load news", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 pk-fade-up">
      <section className="relative rounded-2xl overflow-hidden border border-white/5 h-44 md:h-56">
        <Image src="https://media.base44.com/images/public/6a74924d098c137cf967c644/fee4c98f0_generated_image.png" alt="Pokémon TCG" className="absolute inset-0 w-full h-full" fittingType="fill" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d10] via-[#0b0d10]/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1"><Newspaper className="w-3.5 h-3.5" /> News & Articles</div>
          <h1 className="font-bold text-2xl md:text-4xl tracking-tight">Pokémon TCG news</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">Latest set releases, reveals, price moves, and tournament news — pulled live from the web.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="absolute top-4 right-4 bg-black/40 border-white/20 backdrop-blur hover:bg-black/60">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refresh</Button>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-sm text-slate-500 py-10 text-center rounded-xl border border-dashed border-white/5">No articles found right now. Try refreshing.</div>
      ) : (
        <div className="space-y-3">
          {articles[0] && (
            <a href={articles[0].url || "#"} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-emerald-400/30 transition group md:flex">
              <div className="md:w-64 h-40 md:h-auto shrink-0 relative">
                <Image src="https://media.base44.com/images/public/6a74924d098c137cf967c644/a8e7f02d0_generated_image.png" alt="" className="absolute inset-0 w-full h-full" fittingType="fill" />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-emerald-400/90 text-[10px] font-bold text-[#0e1014]">FEATURED</div>
              </div>
              <div className="p-5 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-bold text-lg leading-snug group-hover:text-emerald-400 transition">{articles[0].title}</div>
                  {articles[0].url && <ExternalLink className="w-4 h-4 text-slate-600 shrink-0" />}
                </div>
                <div className="text-sm text-slate-400 leading-relaxed mb-3">{articles[0].summary}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  {articles[0].source && <span className="px-1.5 py-0.5 rounded bg-white/5">{articles[0].source}</span>}
                  {articles[0].date && <span>{new Date(articles[0].date).toLocaleDateString()}</span>}
                </div>
              </div>
            </a>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            {articles.slice(1).map((a, i) => (
              <a key={i} href={a.url || "#"} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-emerald-400/30 hover:bg-emerald-400/[0.03] transition group">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-sm leading-snug group-hover:text-emerald-400 transition">{a.title}</div>
                  {a.url && <ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />}
                </div>
                <div className="text-xs text-slate-400 leading-relaxed mb-2">{a.summary}</div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  {a.source && <span className="px-1.5 py-0.5 rounded bg-white/5">{a.source}</span>}
                  {a.date && <span>{new Date(a.date).toLocaleDateString()}</span>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}