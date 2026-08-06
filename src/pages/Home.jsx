import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, BookOpen, Search as SearchIcon, TrendingUp, TrendingDown, Layers, ChevronRight, Package, Loader2 } from "lucide-react";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function Home() {
  const [items, setItems] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [list, ph] = await Promise.all([
          base44.entities.CollectionCard.list("-updated_date", 500),
          base44.entities.PackHistory.list("-opened_date", 5),
        ]);
        setItems(list); setPacks(ph);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const qty = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const value = items.reduce((s, i) => s + (i.current_price || 0) * (i.quantity || 1), 0);
  const cost = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0);
  const gain = value - cost;

  const topHoldings = [...items]
    .map((i) => ({ ...i, val: (i.current_price || 0) * (i.quantity || 1) }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 6);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-8 pk-fade-up">
      <header className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1f2b] via-[#161a22] to-[#12151b] p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-24 top-20 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-emerald-400 mb-2">Welcome back</div>
          <h1 className="font-bold text-2xl md:text-4xl tracking-tight">Your Pokémon collection, leveled up.</h1>
          <p className="text-slate-400 mt-2 max-w-xl text-sm">Track value, cost basis, and gain/loss. Rip packs, build your binder, and chase the hits.</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/packs" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-blue-500 text-[#0e1014] font-semibold text-sm hover:opacity-90 transition"><Sparkles className="w-4 h-4" /> Open a Pack</Link>
            <Link to="/search" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition"><SearchIcon className="w-4 h-4" /> Search Cards</Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Layers className="w-4 h-4" />} label="Total Cards" value={String(qty)} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Portfolio Value" value={money(value)} accent="text-emerald-400" />
        <StatCard icon={<Package className="w-4 h-4" />} label="Cost Basis" value={money(cost)} />
        <StatCard icon={gain >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} label="Gain / Loss" value={`${gain >= 0 ? "+" : ""}${money(gain)}`} accent={gain >= 0 ? "text-emerald-400" : "text-red-400"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Top Holdings</div>
            <Link to="/binder" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">View binder <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {topHoldings.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-sm text-slate-500">No cards yet — open a pack or search to start.</div>
              <Link to="/packs" className="text-emerald-400 text-xs hover:underline mt-2 inline-block">Open your first pack →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {topHoldings.map((c) => {
                const style = getRarityStyle(c.rarity);
                return (
                  <div key={c.id} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                    <div className="aspect-[3/4] relative">
                      <img src={c.image_small} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 18px ${style.glow}` }} />
                    </div>
                    <div className="p-1.5"><div className="text-[10px] font-semibold text-emerald-400">{money(c.val)}</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Recent Packs</div>
            <Link to="/packs" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">Open <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {packs.length === 0 ? <div className="text-sm text-slate-500 py-6 text-center">No packs opened yet.</div> : (
            <div className="space-y-2">
              {packs.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/5 p-2.5">
                  <div className="flex -space-x-2">
                    {(p.cards || []).slice(0, 4).map((c, i) => <img key={i} src={c.image} alt="" className="w-8 h-10 object-cover rounded border border-[#12151b]" />)}
                  </div>
                  <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{p.set_name}</div><div className="text-[10px] text-slate-500">{new Date(p.opened_date).toLocaleDateString()}</div></div>
                  <div className="text-emerald-400 font-semibold text-xs">${(p.total_value || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-2"><span className="text-slate-400">{icon}</span><span className="text-[10px] uppercase tracking-widest">{label}</span></div>
      <div className={`font-bold text-xl ${accent || ""}`}>{value}</div>
    </div>
  );
}