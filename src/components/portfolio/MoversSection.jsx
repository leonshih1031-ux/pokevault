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
        const groups = {};
        for (const h of hist) {
          if (!byCard.has(h.card_id)) continue;
          (groups[h.card_id] ||= []).push(h);
        }
        const out = [];
        for (const [cid, arr] of Object.entries(groups)) {
          if (arr.length < 2) continue;
          const latest = arr[0];
          const oldest = arr[arr.length - 1];
          if (oldest.snapshot_date === latest.snapshot_date) continue;
          const prev = Number(oldest.price || 0);
          const now = Number(latest.price || 0);
          if (prev <= 0 || now <= 0) continue;
          const pct = (now / prev - 1) * 100;
          out.push({ ...byCard.get(cid), pct, prev, last: now });
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
          <div className="text-[10px] text-slate-500">{money(m.prev)} → {money(m.last)}</div>
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
        ? <div className="text-xs text-slate-500 py-6 text-center rounded-xl border border-dashed border-white/5">No price movement yet — movers appear as daily snapshots accumulate.</div>
        : <div className="space-y-2">{list.map((m) => <Row key={m.id} m={m} />)}</div>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="font-semibold mb-4">Biggest Movers</div>
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