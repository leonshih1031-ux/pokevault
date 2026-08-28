import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, History, ChevronRight } from "lucide-react";
import PackReveal from "@/components/pokemon/PackReveal";
import { getSets, getSetCards, buildPack, getCardPrice, getChaseCardIds } from "@/lib/pokemonApi";
import { autoTickFromBinder } from "@/lib/setlist";
import { getPackSettings, savePackSettings } from "@/lib/packSettings";
import { useToast } from "@/components/ui/use-toast";

export default function PackOpening() {
  const [sets, setSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [selectedSet, setSelectedSet] = useState(null);
  const [opening, setOpening] = useState(false);
  const [pack, setPack] = useState(null);
  const [chaseIds, setChaseIds] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [preloading, setPreloading] = useState(false);
  const cacheRef = useRef({});
  const preloadRef = useRef({});
  const { toast } = useToast();
  const [pkSettings, setPkSettings] = useState(() => getPackSettings());

  useEffect(() => {
    getSets()
      .then((s) => { setSets(s.slice(0, 24)); setSelectedSet(s[0]); })
      .finally(() => setLoadingSets(false));
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try { const h = await base44.entities.PackHistory.list("-opened_date", 8); setHistory(h); } catch {}
  };

  // Preload cards when a set is selected so packs open instantly.
  useEffect(() => {
    if (!selectedSet) return;
    if (cacheRef.current[selectedSet.id]) return;
    if (preloadRef.current[selectedSet.id]) return;
    preloadRef.current[selectedSet.id] = (async () => {
      setPreloading(true);
      try {
        const cards = await getSetCards(selectedSet.id);
        cacheRef.current[selectedSet.id] = cards;
      } catch {}
      finally { setPreloading(false); }
    })();
  }, [selectedSet]);

  const openPack = async () => {
    if (!selectedSet) return;
    setOpening(true);
    try {
      let cards = cacheRef.current[selectedSet.id];
      // Wait for any in-flight preload, then retry up to 3 times.
      if (!cards && preloadRef.current[selectedSet.id]) {
        await preloadRef.current[selectedSet.id];
        cards = cacheRef.current[selectedSet.id];
      }
      for (let attempt = 0; (!cards || !cards.length) && attempt < 3; attempt++) {
        cards = await getSetCards(selectedSet.id);
        if (cards) cacheRef.current[selectedSet.id] = cards;
      }
      if (!cards || !cards.length) { toast({ title: "Could not load cards for this set — try again", variant: "destructive" }); return; }
      const newPack = buildPack(cards, selectedSet.id, selectedSet.name);
      const value = newPack.reduce((s, c) => s + getCardPrice(c), 0);
      setChaseIds(getChaseCardIds(cards));
      await base44.entities.PackHistory.create({
        set_id: selectedSet.id, set_name: selectedSet.name,
        cards: newPack.map((c) => ({ card_id: c.id, name: c.name, image: c.images?.small, rarity: c.rarity, price: getCardPrice(c) })),
        total_value: value, opened_date: new Date().toISOString(),
      });
      setPack(newPack);
      loadHistory();
    } catch { toast({ title: "Failed to open pack", variant: "destructive" }); }
    finally { setOpening(false); }
  };

  const addAll = async (cards) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await base44.entities.CollectionCard.bulkCreate(cards.map((c) => ({
        card_id: c.id, name: c.name, set_id: c.set?.id, set_name: c.set?.name, number: c.number,
        image_small: c.images?.small, image_large: c.images?.large, rarity: c.rarity, types: c.types || [], supertype: c.supertype,
        quantity: 1, condition: "Near Mint", variant: "Normal", language: "English", grading_company: "Raw",
        purchase_price: getCardPrice(c), date_acquired: today, current_price: getCardPrice(c), folder: "Main",
      })));
      toast({ title: `Added ${cards.length} cards to your binder` });
      autoTickFromBinder(cards);
      setPack(null);
    } catch { toast({ title: "Could not add cards", variant: "destructive" }); }
  };

  return (
    <div className="space-y-8 pk-fade-up">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Pack Opening</div>
        <h1 className="font-bold text-2xl md:text-3xl">Open a booster pack</h1>
        <p className="text-sm text-slate-400">Live cards, rarity-weighted odds, animated reveals. Pick a set and rip it.</p>
      </header>

      <section>
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Select a set</div>
        {loadingSets ? (
          <div className="h-32 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sets.map((s) => (
              <button key={s.id} onClick={() => setSelectedSet(s)}
                className={`group relative rounded-xl border p-3 transition-all text-left ${selectedSet?.id === s.id ? "border-emerald-400/60 bg-emerald-400/5" : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`}>
                <div className="h-12 grid place-items-center mb-2">
                  <img src={s.images?.logo} alt={s.name} className="max-h-12 max-w-full object-contain" />
                </div>
                <div className="text-[11px] font-semibold leading-tight line-clamp-2">{s.name}</div>
                <div className="text-[10px] text-slate-500">{s.total} cards</div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#181b22] to-[#12151b] p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex-1">
          <div className="text-sm text-slate-400">Opening</div>
          <div className="font-bold text-xl">{selectedSet?.name}</div>
          <div className="text-xs text-slate-500 mt-1">10 cards · rarity-weighted · realistic pull rates</div>
        </div>
        <Button size="lg" disabled={opening || !selectedSet} onClick={openPack}
          className="bg-gradient-to-r from-emerald-400 to-blue-500 hover:opacity-90 text-[#0e1014] font-semibold">
          {opening ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…</> : preloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading cards…</> : <><Sparkles className="w-4 h-4 mr-2" /> Open Pack</>}
        </Button>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Post-pack settings</div>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <input type="checkbox" checked={pkSettings.auto_add_to_binder} onChange={(e) => { const s = { ...pkSettings, auto_add_to_binder: e.target.checked, auto_delete_cards: e.target.checked ? false : pkSettings.auto_delete_cards }; setPkSettings(s); savePackSettings(s); }} className="w-4 h-4 accent-emerald-500" />
            <div>
              <div className="text-sm font-medium">Auto-add to binder</div>
              <div className="text-[11px] text-slate-500">Cards are added automatically after reveal</div>
            </div>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer flex-1 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <input type="checkbox" checked={pkSettings.auto_delete_cards} onChange={(e) => { const s = { ...pkSettings, auto_delete_cards: e.target.checked, auto_add_to_binder: e.target.checked ? false : pkSettings.auto_add_to_binder }; setPkSettings(s); savePackSettings(s); }} className="w-4 h-4 accent-emerald-500" />
            <div>
              <div className="text-sm font-medium">Auto-discard pulls</div>
              <div className="text-[11px] text-slate-500">Cards are discarded after reveal</div>
            </div>
          </label>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-slate-500" /><div className="text-xs uppercase tracking-widest text-slate-500">Recent pulls</div></div>
        {history.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center rounded-xl border border-dashed border-white/5">No packs opened yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex -space-x-3">
                  {(h.cards || []).slice(0, 5).map((c, i) => (
                    <img key={i} src={c.image} alt={c.name} className="w-9 h-12 object-cover rounded-md border-2 border-[#12151b]" />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{h.set_name}</div>
                  <div className="text-[11px] text-slate-500">{h.cards?.length} cards · {new Date(h.opened_date).toLocaleDateString()}</div>
                </div>
                <div className="text-emerald-400 font-semibold text-sm">${(h.total_value || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pack && <PackReveal pack={pack} setName={selectedSet?.name} chaseIds={chaseIds} onAddAll={addAll} onClose={() => setPack(null)} onDiscard={() => setPack(null)} settings={pkSettings} />}
    </div>
  );
}