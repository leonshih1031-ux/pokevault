import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getPriceTrend } from "@/lib/pokemonApi";

export default function PriceHistoryChart({ card }) {
  const [data, setData] = useState(null);
  const [source, setSource] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hist = await base44.entities.CardPriceHistory.filter({ card_id: card.id }, "snapshot_date", 90);
        if (cancelled) return;
        if (hist && hist.length >= 2) {
          setData(hist.map((h) => ({ label: new Date(h.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), price: Number(h.price || 0) })));
          setSource("Recorded TCGplayer prices · daily snapshots");
          return;
        }
        let trend = getPriceTrend(card);
        if ((!trend || trend.length < 2) && card.id) {
          const r = await fetch(`https://api.pokemontcg.io/v2/cards/${card.id}`, { headers: { Accept: "application/json" } });
          if (cancelled) return;
          if (r.ok) {
            const full = (await r.json()).data;
            trend = full ? getPriceTrend(full) : trend;
          }
        }
        if (trend && trend.length >= 2) {
          setData(trend);
          setSource("Recent trend · cardmarket 30d → now");
          return;
        }
        setData(null);
        setSource("");
      } catch { setData(null); }
    })();
    return () => { cancelled = true; };
  }, [card]);

  if (!data) {
    return <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-500">No price history yet — real history accumulates as daily snapshots are recorded.</div>;
  }

  const first = data[0].price, last = data[data.length - 1].price;
  const up = last >= first;
  const pct = first ? (((last - first) / first) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Price history</div>
        <div className={`text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>{up ? "▲" : "▼"} {pct}%</div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ background: "#181b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]} />
            <Line type="monotone" dataKey="price" stroke={up ? "#34d399" : "#f87171"} strokeWidth={2} dot={{ r: 2.5, fill: up ? "#34d399" : "#f87171" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-slate-500 mt-1">{source}</div>
    </div>
  );
}