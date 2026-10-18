import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ArrowLeft, Heart } from "lucide-react";
import { getSetCards, getRarityStyle } from "@/lib/pokemonApi";
import SetRarityBreakdown, { buildRarityStats } from "@/components/setlist/SetRarityBreakdown";
import { useToast } from "@/components/ui/use-toast";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "missing", label: "Missing" },
];

export default function SetChecklistView({ set, onBack }) {
  const [cards, setCards] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [all, entries] = await Promise.all([
          getSetCards(set.id),
          base44.entities.SetChecklist.filter({ set_id: set.id }),
        ]);
        if (!alive) return;
        setCards(all);
        const map = {};
        for (const e of entries) map[e.card_id] = e;
        setChecked(map);
      } catch {
        toast({ title: "Could not load set", variant: "destructive" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [set.id]);

  const toggle = async (card) => {
    const existing = checked[card.id];
    setBusy(card.id);
    try {
      if (existing) {
        await base44.entities.SetChecklist.delete(existing.id);
        setChecked((m) => { const n = { ...m }; delete n[card.id]; return n; });
      } else {
        const entry = await base44.entities.SetChecklist.create({
          set_id: set.id, set_name: set.name, card_id: card.id, card_number: card.number,
          name: card.name, image_small: card.images?.small, rarity: card.rarity,
          date_checked: new Date().toISOString(),
        });
        setChecked((m) => ({ ...m, [card.id]: entry }));
      }
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const total = cards.length;
  const have = Object.keys(checked).length;
  const missing = total - have;
  const pct = total ? Math.round((have / total) * 100) : 0;

  const filtered = cards.filter((c) => {
    if (filter === "owned") return !!checked[c.id];
    if (filter === "missing") return !checked[c.id];
    return true;
  });

  const addMissingToWishlist = async () => {
    const missingCards = cards.filter((c) => !checked[c.id]);
    if (!missingCards.length) {
      toast({ title: "Set fully collected!" });
      return;
    }
    setAdding(true);
    try {
      const existing = await base44.entities.WishlistItem.filter({ card_id: { $in: missingCards.map((c) => c.id) } });
      const haveIds = new Set(existing.map((w) => w.card_id));
      const toCreate = missingCards
        .filter((c) => !haveIds.has(c.id))
        .map((c) => ({
          card_id: c.id, name: c.name, set_id: set.id, set_name: set.name,
          number: c.number, image_small: c.images?.small, image_large: c.images?.large,
          rarity: c.rarity, priority: "Medium", list_type: "wishlist",
        }));
      if (toCreate.length) await base44.entities.WishlistItem.bulkCreate(toCreate);
      toast({ title: `${toCreate.length} missing cards added to wishlist` });
    } catch {
      toast({ title: "Could not add to wishlist", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5 pk-fade-up">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> All sets</button>
      <header className="flex items-center gap-3">
        {set.images?.logo && <img src={set.images.logo} alt={set.name} className="h-10 object-contain" />}
        <div>
          <h1 className="font-bold text-xl">{set.name}</h1>
          <div className="text-xs text-slate-500">{have} of {total} collected · {pct}% · {missing} missing</div>
        </div>
      </header>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all" style={{ width: `${pct}%` }} /></div>
      {!loading && cards.length > 0 && (
        <SetRarityBreakdown stats={buildRarityStats(cards, checked)} />
      )}
      {!loading && cards.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-lg bg-white/5 p-0.5">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === f.key ? "bg-emerald-500 text-[#0e1014]" : "text-slate-400 hover:text-white"}`}>
                {f.label}{f.key === "owned" && ` (${have})`}{f.key === "missing" && ` (${missing})`}
              </button>
            ))}
          </div>
          {missing > 0 && (
            <button onClick={addMissingToWishlist} disabled={adding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Heart className="w-3.5 h-3.5" />}
              Add missing to wishlist
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center rounded-xl border border-dashed border-white/5">
          {filter === "owned" ? "No cards collected yet — start ticking!" : filter === "missing" ? "No missing cards — set complete! 🎉" : "No cards found."}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {filtered.map((c) => {
            const on = !!checked[c.id];
            return (
              <button key={c.id} onClick={() => toggle(c)} disabled={busy === c.id} className={`relative rounded-lg overflow-hidden border transition-all ${on ? "border-emerald-400/60" : "border-white/5 opacity-50 hover:opacity-100"}`}>
                <img src={c.images?.small} alt={c.name} className="w-full aspect-[3/4] object-cover" />
                <div className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full grid place-items-center text-[10px] font-bold" style={{ background: on ? "#10b981" : "rgba(0,0,0,0.6)", color: on ? "#0e1014" : "#94a3b8" }}>{on ? "✓" : c.number}</div>
                {busy === c.id && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="w-4 h-4 animate-spin" /></div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}