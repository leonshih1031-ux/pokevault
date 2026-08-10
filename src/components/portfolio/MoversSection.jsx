import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function MoversSection({ items }) {
  const [movers, setMovers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const byCard = new Map((items || []).map((i) => [i.card_id, i]));
      try {
        const hist = await base44.entities.CardPriceHistory.list("-snapshot_date", 500);
        if (cancelled) return;
        // Latest snapshot per card, keep only those with a real 30d movement.
        const latestByCard = new Map();
        for (const h of hist) {
          if (!byCard.has(h.card_id)) continue;
          if (!latestByCard.has(h.card_id)) latestByCard.set(h.card_id, h);
        }
        const out = [];
        for (const [cid, h] of latestByCard) {
          if (h.pct_30d == null) continue;
          out.push({ ...byCard.get(cid), pct: h.pct_30d, last: h.price });
        }
        setMovers(out);
      } catch {
        if (!cancelled) setMovers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [items]);

  const ready = movers !== null;
  const gainers = ready ? [...movers].sort((a, b) => b.pct - a.pct).slice(0, 5) : [];
  const losers = ready ? [...movers].sort((a, b) => a.pct - b.pct).slice(0, 5) : [];

  const Row = ({ m }) => {
    const up = m.pct >= 0;
    const style = getRarityStyle(m.rarity);
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2">
        <div className="relative w-8 h-10 shrink-0 rounded overflow-hidden">
          <img src={m.image_small} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 10px ${style.glow}` }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{m.name}</div>
          <div className="text-[10px] text-slate-500">{money(m.last)} · 30d</div>
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
        ? <div className="text-xs text-slate-500 py-6 text-center rounded-xl border border-dashed border-white/5">No price movement data yet — movers appear after the daily price snapshot runs.</div>
        : <div className="space-y-2">{list.map((m) => <Row key={m.id} m={m} />)}</div>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="font-semibold mb-4">Biggest Movers <span className="text-[10px] font-normal text-slate-500 ml-1">30-day market change</span></div>
      {!ready ? (
        <div className="grid place-items-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          <Panel title="Top Gainers" icon={<TrendingUp className="w-3.5 h-3.5" />} list={gainers} accent="text-emerald-400" />
          <Panel title="Top Losers" icon={<TrendingDown className="w-3.5 h-3.5" />} list={losers} accent="text-red-400" />
        </div>
      )}
    </section>
  );
}