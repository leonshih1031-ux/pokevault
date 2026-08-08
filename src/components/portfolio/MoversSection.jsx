import { TrendingUp, TrendingDown } from "lucide-react";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function MoversSection({ items }) {
  const movers = (items || [])
    .map((i) => {
      const cost = (i.purchase_price || 0) * (i.quantity || 1);
      const val = (i.current_price || 0) * (i.quantity || 1);
      const gain = val - cost;
      const pct = cost > 0 ? (val / cost - 1) * 100 : null;
      return { ...i, cost, val, gain, pct };
    })
    .filter((i) => i.pct !== null && i.current_price > 0);

  const gainers = [...movers].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const losers = [...movers].sort((a, b) => a.pct - b.pct).slice(0, 5);

  const Row = ({ m }) => {
    const up = m.gain >= 0;
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2">
        <img src={m.image_small} alt={m.name} className="w-8 h-10 object-cover rounded shrink-0" loading="lazy" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{m.name}</div>
          <div className="text-[10px] text-slate-500">{money(m.cost)} → {money(m.val)}</div>
        </div>
        <div className={`text-xs font-semibold shrink-0 ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? "+" : ""}{m.pct.toFixed(1)}%
        </div>
      </div>
    );
  };

  const Panel = ({ title, icon, list, accent }) => (
    <div>
      <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-slate-500">
        <span className={accent}>{icon}</span>{title}
      </div>
      {list.length === 0
        ? <div className="text-xs text-slate-500 py-6 text-center rounded-xl border border-dashed border-white/5">Set purchase prices to see movers.</div>
        : <div className="space-y-2">{list.map((m) => <Row key={m.id} m={m} />)}</div>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="font-semibold mb-4">Biggest Movers</div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Panel title="Top Gainers" icon={<TrendingUp className="w-3.5 h-3.5" />} list={gainers} accent="text-emerald-400" />
        <Panel title="Top Losers" icon={<TrendingDown className="w-3.5 h-3.5" />} list={losers} accent="text-red-400" />
      </div>
    </section>
  );
}