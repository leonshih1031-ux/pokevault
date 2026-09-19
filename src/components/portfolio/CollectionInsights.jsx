import { useMemo } from "react";
import { BarChart3, Layers } from "lucide-react";
import { getRarityStyle, rarityRank } from "@/lib/pokemonApi";
import { rarityGroup } from "@/components/setlist/SetRarityBreakdown";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function CollectionInsights({ items }) {
  const rarityStats = useMemo(() => {
    const map = {};
    for (const c of items) {
      const g = rarityGroup(c.rarity);
      const val = (c.current_price || 0) * (c.quantity || 1);
      if (!map[g]) map[g] = { group: g, count: 0, value: 0 };
      map[g].count += c.quantity || 1;
      map[g].value += val;
    }
    return Object.values(map).sort((a, b) => rarityRank(b.group) - rarityRank(a.group));
  }, [items]);

  const setStats = useMemo(() => {
    const map = {};
    for (const c of items) {
      const key = c.set_id || "unknown";
      const val = (c.current_price || 0) * (c.quantity || 1);
      if (!map[key]) map[key] = { setId: key, setName: c.set_name || "Unknown", count: 0, value: 0 };
      map[key].count += c.quantity || 1;
      map[key].value += val;
    }
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [items]);

  const maxRarityValue = Math.max(...rarityStats.map((r) => r.value), 1);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <div className="font-semibold">Collection Insights</div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Rarity Distribution */}
        <div>
          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Distribution by Rarity</div>
          <div className="space-y-2">
            {rarityStats.map((r) => {
              const style = getRarityStyle(r.group);
              const pct = (r.value / maxRarityValue) * 100;
              return (
                <div key={r.group} className="flex items-center gap-2">
                  <div className="w-20 text-[11px] text-slate-400 shrink-0">{r.group}</div>
                  <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden relative">
                    <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: style.color, opacity: 0.7 }} />
                  </div>
                  <div className="w-16 text-right text-[11px]">
                    <span className="font-semibold text-slate-200">{money(r.value)}</span>
                    <span className="text-slate-600 ml-1">·{r.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Sets by Value */}
        <div>
          <div className="text-xs text-slate-500 mb-3">Top Sets by Value</div>
          <div className="space-y-2">
            {setStats.map((s, i) => {
              const maxVal = setStats[0]?.value || 1;
              const pct = (s.value / maxVal) * 100;
              return (
                <div key={s.setId} className="flex items-center gap-2">
                  <div className="w-5 text-[11px] text-slate-600 font-mono">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate">{s.setName}</div>
                    <div className="h-1.5 rounded bg-white/5 overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-emerald-400/60 to-blue-500/60 rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="w-16 text-right text-[11px] font-semibold text-emerald-400 shrink-0">{money(s.value)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}