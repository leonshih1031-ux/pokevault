import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ListChecks, CheckCheck, Search, Trophy, Layers, Sparkles } from "lucide-react";
import { getSets } from "@/lib/pokemonApi";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { getAutoTickSetting, setAutoTickSetting, backTickFromBinder, unTickFromBinder } from "@/lib/setlist";
import { useToast } from "@/components/ui/use-toast";
import SetChecklistView from "@/components/setlist/SetChecklistView";

const SORTS = [
  { key: "completion", label: "Completion" },
  { key: "name", label: "Name" },
  { key: "owned", label: "Cards owned" },
];

export default function SetList() {
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [autoTick, setAutoTick] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("completion");
  const { toast } = useToast();

  const loadCounts = async () => {
    try {
      const entries = await base44.entities.SetChecklist.list("-created_date", 500);
      const map = {};
      for (const e of entries) map[e.set_id] = (map[e.set_id] || 0) + 1;
      setCounts(map);
    } catch {}
  };

  useEffect(() => {
    getSets().then((s) => setSets(s.slice(0, 24))).finally(() => setLoading(false));
    loadCounts();
    getAutoTickSetting().then(setAutoTick);
  }, []);

  const stats = useMemo(() => {
    let totalOwned = 0, totalCards = 0, started = 0, completed = 0;
    for (const s of sets) {
      const have = counts[s.id] || 0;
      totalOwned += have;
      totalCards += s.total || 0;
      if (have > 0) started++;
      if (s.total && have >= s.total) completed++;
    }
    return { totalOwned, totalCards, started, completed, overall: totalCards ? Math.round((totalOwned / totalCards) * 100) : 0 };
  }, [sets, counts]);

  const sortedSets = useMemo(() => {
    let list = sets.filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()));
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "owned") return (counts[b.id] || 0) - (counts[a.id] || 0);
      const pa = a.total ? (counts[a.id] || 0) / a.total : 0;
      const pb = b.total ? (counts[b.id] || 0) / b.total : 0;
      return pb - pa;
    });
    return list;
  }, [sets, counts, query, sort]);

  const toggleAuto = async (on) => {
    setToggling(true);
    try {
      await setAutoTickSetting(on);
      setAutoTick(on);
      if (on) {
        const { created } = await backTickFromBinder();
        await loadCounts();
        toast({ title: created ? `Auto-tick enabled · ${created} cards ticked` : "Auto-tick enabled" });
      } else {
        await unTickFromBinder();
        await loadCounts();
        toast({ title: "Auto-tick disabled · binder cards unticked" });
      }
    } catch {
      toast({ title: "Could not save setting", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  if (selected) return <SetChecklistView set={selected} onBack={() => { setSelected(null); loadCounts(); }} />;

  return (
    <div className="space-y-6 pk-fade-up">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Set List</div>
          <h1 className="font-bold text-2xl md:text-3xl">Set completion</h1>
          <p className="text-sm text-slate-400">Track your progress through each set, card by card.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <span className="hidden sm:flex items-center gap-1.5"><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Auto-tick from binder</span>
          <Switch checked={autoTick} onCheckedChange={toggleAuto} disabled={toggling} />
        </label>
      </header>

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-1"><Sparkles className="w-4 h-4" /><span className="text-xs uppercase tracking-wide text-slate-500">Overall</span></div>
            <div className="text-2xl font-bold">{stats.overall}%</div>
            <div className="text-[11px] text-slate-500">{stats.totalOwned} / {stats.totalCards} cards</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-1"><Layers className="w-4 h-4" /><span className="text-xs uppercase tracking-wide text-slate-500">Sets started</span></div>
            <div className="text-2xl font-bold">{stats.started}<span className="text-base text-slate-600"> / {sets.length}</span></div>
            <div className="text-[11px] text-slate-500">sets with at least 1 card</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-1"><Trophy className="w-4 h-4" /><span className="text-xs uppercase tracking-wide text-slate-500">Completed</span></div>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-[11px] text-slate-500">sets 100% collected</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-slate-300 mb-1"><ListChecks className="w-4 h-4" /><span className="text-xs uppercase tracking-wide text-slate-500">Cards owned</span></div>
            <div className="text-2xl font-bold">{stats.totalOwned}</div>
            <div className="text-[11px] text-slate-500">across all sets</div>
          </div>
        </div>
      )}

      {!loading && sets.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sets…" className="bg-white/5 border-white/10 pl-9" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm">
            {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : sortedSets.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center rounded-xl border border-dashed border-white/5">No sets match your search.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {sortedSets.map((s) => {
            const have = counts[s.id] || 0;
            const pct = s.total ? Math.min(100, Math.round((have / s.total) * 100)) : 0;
            const done = s.total && have >= s.total;
            return (
              <button key={s.id} onClick={() => setSelected(s)} className="group rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/15 hover:bg-white/[0.04] transition-all text-left">
                <div className="h-12 grid place-items-center mb-2"><img src={s.images?.logo} alt={s.name} className="max-h-12 max-w-full object-contain" /></div>
                <div className="text-[11px] font-semibold leading-tight line-clamp-2">{s.name}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{ width: `${pct}%` }} /></div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>{have}/{s.total} · {pct}%</span>
                  {done && <span className="text-emerald-400 font-bold">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}