import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Plus, Loader2, TrendingUp, TrendingDown, Layers, RefreshCw, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import EditCollectionModal from "@/components/pokemon/EditCollectionModal";
import ShareBinderModal from "@/components/binder/ShareBinderModal";
import { getSets, getRarityStyle, CONDITIONS, fetchCardPrices } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

const money = (n) => `$${(n || 0).toFixed(2)}`;
const priceStr = (n) => (n > 0 ? money(n) : "—");

export default function Binder() {
  const [items, setItems] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [setFilter, setSetFilter] = useState("all");
  const [condFilter, setCondFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch collection and sets independently so a transient API hiccup
      // on one doesn't nuke the other.
      let list = [];
      try {
        list = await base44.entities.CollectionCard.list("-updated_date", 500);
      } catch { toast({ title: "Could not load collection", variant: "destructive" }); }
      if (cancelled) return;
      setItems(list);
      setSets(await getSets());
      setLoading(false);

      // Auto-refresh prices for cards that have no market price yet — the
      // price extraction logic has been improved to check more TCGPlayer
      // fields (directLow, mid), so many cards that previously showed "—"
      // will now get a real price without the user clicking Refresh.
      const unpriced = list.filter((i) => !i.current_price || i.current_price === 0).map((i) => i.card_id).filter(Boolean);
      if (unpriced.length === 0) return;
      try {
        const prices = await fetchCardPrices(unpriced);
        if (cancelled) return;
        const updates = list
          .filter((i) => prices[i.card_id] != null && prices[i.card_id] > 0 && prices[i.card_id] !== i.current_price)
          .map((i) => ({ id: i.id, current_price: prices[i.card_id] }));
        if (updates.length) {
          await base44.entities.CollectionCard.bulkUpdate(updates);
          if (cancelled) return;
          setItems(await base44.entities.CollectionCard.list("-updated_date", 500));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const setMap = useMemo(() => { const m = {}; sets.forEach((s) => { m[s.id] = s; }); return m; }, [sets]);

  const stats = useMemo(() => {
    const qty = items.reduce((s, i) => s + (i.quantity || 1), 0);
    const value = items.reduce((s, i) => s + (i.current_price || 0) * (i.quantity || 1), 0);
    const cost = items.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0);
    const gain = value - cost;
    const pct = cost > 0 ? (gain / cost) * 100 : 0;
    return { qty, value, cost, gain, pct };
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (setFilter !== "all" && i.set_id !== setFilter) return false;
    if (condFilter !== "all" && i.condition !== condFilter) return false;
    if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [items, setFilter, condFilter, query]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach((i) => { (g[i.set_id] = g[i.set_id] || []).push(i); });
    return Object.entries(g).sort((a, b) => (setMap[a[0]]?.releaseDate < setMap[b[0]]?.releaseDate ? 1 : -1));
  }, [filtered, setMap]);

  const refresh = async () => { const list = await base44.entities.CollectionCard.list("-updated_date", 500); setItems(list); };
  const onSaved = async () => { setEditing(null); await refresh(); };

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const ids = items.map((i) => i.card_id).filter(Boolean);
      const prices = await fetchCardPrices(ids);
      const updates = items
        .filter((i) => prices[i.card_id] != null && prices[i.card_id] !== i.current_price)
        .map((i) => ({ id: i.id, current_price: prices[i.card_id] }));
      if (updates.length) await base44.entities.CollectionCard.bulkUpdate(updates);
      await refresh();
      toast({ title: `Updated ${updates.length} card price${updates.length === 1 ? "" : "s"}` });
    } catch { toast({ title: "Price refresh failed", variant: "destructive" }); }
    finally { setRefreshing(false); }
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-8 pk-fade-up">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Portfolio</div>
          <h1 className="font-bold text-2xl md:text-3xl">Your Binder</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="bg-white/5" onClick={() => setShareOpen(true)}><Share2 className="w-4 h-4 mr-1.5" /> Share</Button>
          <Button variant="secondary" className="bg-white/5" onClick={refreshPrices} disabled={refreshing || items.length === 0}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh Prices
          </Button>
          <Link to="/search"><Button variant="secondary" className="bg-white/5"><Plus className="w-4 h-4 mr-1.5" /> Add Cards</Button></Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total Cards" value={String(stats.qty)} />
        <Stat label="Portfolio Value" value={money(stats.value)} accent="text-emerald-400" />
        <Stat label="Cost Basis" value={money(stats.cost)} />
        <Stat label="Gain / Loss" value={`${stats.gain >= 0 ? "+" : ""}${money(stats.gain)}`} sub={`${stats.pct >= 0 ? "+" : ""}${stats.pct.toFixed(1)}%`} accent={stats.gain >= 0 ? "text-emerald-400" : "text-red-400"} icon={stats.gain >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search your collection…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-white/[0.03] border-white/10" />
        </div>
        <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 text-sm h-10">
          <option value="all">All sets</option>
          {[...new Set(items.map((i) => i.set_id).filter(Boolean))].map((id) => <option key={id} value={id}>{setMap[id]?.name || id}</option>)}
        </select>
        <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 text-sm h-10">
          <option value="all">All conditions</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
          <div className="text-slate-400 mb-1">Your binder is empty</div>
          <Link to="/search" className="text-emerald-400 text-sm hover:underline">Search for cards to add →</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([setId, cards]) => {
            const set = setMap[setId];
            const total = set?.printedTotal || set?.total || 0;
            const unique = new Set(cards.map((c) => c.card_id)).size;
            const pct = total ? Math.min(100, (unique / total) * 100) : 0;
            return (
              <section key={setId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {set?.images?.symbol && <img src={set.images.symbol} className="w-5 h-5" alt="" />}
                    <div className="font-semibold text-sm">{set?.name || "Unknown set"}</div>
                  </div>
                  <div className="text-xs text-slate-500">{unique}/{total || "?"} unique</div>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 mb-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {cards.map((c) => {
                    const style = getRarityStyle(c.rarity);
                    const val = (c.current_price || 0) * (c.quantity || 1);
                    return (
                      <button key={c.id} onClick={() => setEditing(c)} className="group relative rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] hover:border-white/20 transition pk-fade-up">
                        <div className="aspect-[3/4] relative">
                          <img src={c.image_small} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white">×{c.quantity}</div>
                          {c.condition && c.condition !== "Near Mint" && <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/70 text-[8px] text-slate-300">{c.condition}</div>}
                          <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 18px ${style.glow}` }} />
                        </div>
                        <div className="p-2">
                          <div className="text-[11px] font-medium leading-tight line-clamp-1">{c.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px]" style={{ color: style.color }}>{c.rarity}</span>
                            <span className="text-[10px] font-semibold text-emerald-400">{priceStr(val)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editing && <EditCollectionModal entry={editing} open={!!editing} onOpenChange={(o) => !o && onSaved()} />}
      <ShareBinderModal open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}

function Stat({ label, value, sub, accent, icon }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-bold text-lg flex items-center gap-1.5 ${accent || ""}`}>{icon}{value}</div>
      {sub && <div className={`text-xs ${accent || "text-slate-500"}`}>{sub}</div>}
    </div>
  );
}