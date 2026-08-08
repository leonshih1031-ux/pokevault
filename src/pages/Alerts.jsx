import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Trash2, Loader2, Search, Plus, ArrowDown, ArrowUp, Check, RefreshCw } from "lucide-react";
import { searchCards, getCard, getCardPrice, getRarityStyle } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState("below");
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try { const a = await base44.entities.PriceAlert.list("-created_date", 100); setAlerts(a); }
    catch {} finally { setLoading(false); }
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try { const { cards } = await searchCards({ query, pageSize: 12 }); setResults(cards); }
    catch { toast({ title: "Search failed", variant: "destructive" }); }
    finally { setSearching(false); }
  };

  const pick = (c) => {
    setSelected(c);
    setTarget(String((getCardPrice(c) || 0).toFixed(2)));
    setResults([]); setQuery("");
  };

  const createAlert = async () => {
    if (!selected || !target) return;
    setCreating(true);
    try {
      await base44.entities.PriceAlert.create({
        card_id: selected.id, name: selected.name, image_small: selected.images?.small,
        set_id: selected.set?.id, set_name: selected.set?.name, rarity: selected.rarity,
        target_price: Number(target), direction, triggered: false,
      });
      toast({ title: "Alert created" });
      setSelected(null); setTarget(""); setDirection("below");
      loadAlerts();
    } catch { toast({ title: "Could not create alert", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const remove = async (id) => {
    try { await base44.entities.PriceAlert.delete(id); setAlerts((a) => a.filter((x) => x.id !== id)); }
    catch { toast({ title: "Could not delete", variant: "destructive" }); }
  };

  const checkNow = async () => {
    setChecking(true);
    const active = alerts.filter((a) => !a.triggered);
    let triggeredCount = 0;
    for (const a of active) {
      try {
        const card = await getCard(a.card_id);
        const price = getCardPrice(card);
        const hit = a.direction === "below" ? price > 0 && price <= a.target_price : price >= a.target_price;
        await base44.entities.PriceAlert.update(a.id, { last_price: price, last_checked: new Date().toISOString(), triggered: hit });
        if (hit) triggeredCount++;
      } catch {}
    }
    toast({ title: triggeredCount ? `${triggeredCount} alert(s) triggered!` : "Prices checked — no triggers yet" });
    loadAlerts();
    setChecking(false);
  };

  return (
    <div className="space-y-8 pk-fade-up">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Price Alerts</div>
          <h1 className="font-bold text-2xl md:text-3xl">Get notified on price moves</h1>
          <p className="text-sm text-slate-400">Set a target and direction. We check prices every 6 hours and email you when hit — or check now.</p>
        </div>
        <Button variant="outline" onClick={checkNow} disabled={checking || !alerts.length} className="shrink-0">
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Check now
        </Button>
      </header>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
        <div className="font-semibold">Create an alert</div>
        {!selected ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
                  placeholder="Search a card by name…" className="pl-9" />
              </div>
              <Button onClick={doSearch} disabled={searching || !query.trim()}>
                {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Search
              </Button>
            </div>
            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {results.map((c) => (
                  <button key={c.id} onClick={() => pick(c)} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition text-left">
                    <img src={c.images?.small} alt={c.name} className="w-8 h-10 object-cover rounded shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{c.set?.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <img src={selected.images?.small} alt={selected.name} className="w-12 h-16 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{selected.name}</div>
                <div className="text-xs text-slate-500">{selected.set?.name} · {money(getCardPrice(selected))}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Change</Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Target price ($)</Label>
                <Input type="number" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  <button onClick={() => setDirection("below")} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition ${direction === "below" ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400" : "border-white/5 bg-white/[0.02] text-slate-400"}`}><ArrowDown className="w-4 h-4" /> Drops below</button>
                  <button onClick={() => setDirection("above")} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition ${direction === "above" ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400" : "border-white/5 bg-white/[0.02] text-slate-400"}`}><ArrowUp className="w-4 h-4" /> Rises above</button>
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={createAlert} disabled={creating || !target} className="w-full">
                  {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create alert
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Your alerts</div>
        {loading ? (
          <div className="h-24 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center rounded-xl border border-dashed border-white/5">No alerts yet — search above to create one.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {alerts.map((a) => {
              const style = getRarityStyle(a.rarity);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <img src={a.image_small} alt={a.name} className="w-10 h-14 object-cover rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{a.set_name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] inline-flex items-center gap-1" style={{ color: style.color }}>
                        {a.direction === "below" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />} {money(a.target_price)}
                      </span>
                      {a.last_price != null && <span className="text-[11px] text-slate-500">now {money(a.last_price)}</span>}
                      {a.triggered && <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400"><Check className="w-3 h-3" /> Triggered</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(a.id)} className="text-slate-500 hover:text-red-400 transition p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}