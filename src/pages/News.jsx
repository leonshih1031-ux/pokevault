import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Newspaper, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> News & Articles</div>
          <h1 className="font-bold text-2xl md:text-3xl">Pokémon TCG news</h1>
          <p className="text-sm text-slate-400">Latest set releases, reveals, price moves, and tournament news — pulled live from the web.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="shrink-0">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Refresh</Button>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-sm text-slate-500 py-10 text-center rounded-xl border border-dashed border-white/5">No articles found right now. Try refreshing.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {articles.map((a, i) => (
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
      )}
    </div>
  );
}