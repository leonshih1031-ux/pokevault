import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function PublicBinder() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getPublicBinder", { user_id: userId });
        if (res.data?.error) { setError(res.data.error); setData(null); }
        else { setData(res.data); setError(""); }
      } catch (e) { setError(e.message || "Could not load binder"); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const grouped = (() => {
    if (!data?.cards) return [];
    const g = {};
    data.cards.forEach((c) => { (g[c.set_id] = g[c.set_id] || []).push(c); });
    return Object.entries(g);
  })();

  return (
    <div className="min-h-screen bg-[#0e1014] text-slate-100">
      <header className="border-b border-white/5 bg-[#12151b]">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold"><PokeballIcon /> PokePortfolio</Link>
          <Link to="/" className="text-xs text-slate-400 hover:text-emerald-400">Create your own binder →</Link>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-8 pk-fade-up">
        {loading ? (
          <div className="grid place-items-center py-24"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : error ? (
          <div className="text-center py-24">
            <Lock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <div className="text-slate-300 mb-1">{error}</div>
            <Link to="/" className="text-emerald-400 text-sm hover:underline">Back to PokePortfolio</Link>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.04] to-transparent p-6 mb-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 grid place-items-center text-2xl font-bold text-[#0e1014]">{(data.user.display_name || "C").charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Public Collection</div>
                  <h1 className="font-bold text-2xl md:text-3xl">{data.user.display_name}</h1>
                  {data.user.bio && <p className="text-sm text-slate-400 mt-1 max-w-xl">{data.user.bio}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-6">
                <Stat label="Total Cards" value={String(data.stats.qty)} />
                <Stat label="Portfolio Value" value={money(data.stats.value)} accent="text-emerald-400" />
                <Stat label="Unique Sets" value={String(data.stats.uniqueSets)} />
              </div>
            </section>

            {data.stats.top?.length > 0 && (
              <section className="mb-8">
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Top Cards</div>
                <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
                  {data.stats.top.map((t, i) => (
                    <div key={i} className="w-28 shrink-0 rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                      <div className="aspect-[3/4]"><img src={t.image_small} alt={t.name} className="w-full h-full object-cover" /></div>
                      <div className="p-1.5"><div className="text-[10px] font-medium line-clamp-1">{t.name}</div><div className="text-[10px] font-semibold text-emerald-400">{money(t.value)}</div></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {grouped.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 text-slate-400">This binder is empty.</div>
            ) : (
              <div className="space-y-8">
                {grouped.map(([setId, cards]) => (
                  <section key={setId}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm">{cards[0]?.set_name || "Unknown set"}</div>
                      <div className="text-xs text-slate-500">{cards.length} card{cards.length === 1 ? "" : "s"}</div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {cards.map((c) => {
                        const style = getRarityStyle(c.rarity);
                        const val = (c.current_price || 0) * (c.quantity || 1);
                        return (
                          <div key={c.id} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                            <div className="aspect-[3/4] relative">
                              <img src={c.image_small} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                              {c.quantity > 1 && <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-bold">×{c.quantity}</div>}
                              <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 18px ${style.glow}` }} />
                            </div>
                            <div className="p-2">
                              <div className="text-[11px] font-medium leading-tight line-clamp-1">{c.name}</div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px]" style={{ color: style.color }}>{c.rarity}</span>
                                <span className="text-[10px] font-semibold text-emerald-400">{val > 0 ? money(val) : ""}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div><div className={`font-bold text-lg ${accent || ""}`}>{value}</div></div>;
}

function PokeballIcon() {
  return (
    <svg viewBox="0 0 36 36" className="w-6 h-6" aria-hidden="true">
      <defs><clipPath id="pkclip-pub"><circle cx="18" cy="18" r="17" /></clipPath></defs>
      <g clipPath="url(#pkclip-pub)"><rect x="0" y="0" width="36" height="36" fill="#f1f5f9" /><rect x="0" y="18" width="36" height="18" fill="#ef4444" /><rect x="0" y="14.5" width="36" height="7" fill="#0e1014" /></g>
      <circle cx="18" cy="18" r="17" fill="none" stroke="#0e1014" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="6" fill="#f1f5f9" stroke="#0e1014" strokeWidth="1.5" />
    </svg>
  );
}