import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ListChecks, CheckCheck } from "lucide-react";
import { getSets } from "@/lib/pokemonApi";
import { Switch } from "@/components/ui/switch";
import { getAutoTickSetting, setAutoTickSetting } from "@/lib/setlist";
import { useToast } from "@/components/ui/use-toast";
import SetChecklistView from "@/components/setlist/SetChecklistView";

export default function SetList() {
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [autoTick, setAutoTick] = useState(false);
  const [toggling, setToggling] = useState(false);
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
    getSets().then((s) => setSets(s.slice(0, 24))).catch(() => toast({ title: "Could not load sets", variant: "destructive" })).finally(() => setLoading(false));
    loadCounts();
    getAutoTickSetting().then(setAutoTick);
  }, []);

  const toggleAuto = async (on) => {
    setToggling(true);
    try {
      await setAutoTickSetting(on);
      setAutoTick(on);
      toast({ title: on ? "Auto-tick enabled" : "Auto-tick disabled" });
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

      {loading ? (
        <div className="h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {sets.map((s) => {
            const have = counts[s.id] || 0;
            const pct = s.total ? Math.min(100, Math.round((have / s.total) * 100)) : 0;
            return (
              <button key={s.id} onClick={() => setSelected(s)} className="group rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:border-white/15 hover:bg-white/[0.04] transition-all text-left">
                <div className="h-12 grid place-items-center mb-2"><img src={s.images?.logo} alt={s.name} className="max-h-12 max-w-full object-contain" /></div>
                <div className="text-[11px] font-semibold leading-tight line-clamp-2">{s.name}</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{ width: `${pct}%` }} /></div>
                <div className="text-[10px] text-slate-500 mt-1">{have}/{s.total} · {pct}%</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}