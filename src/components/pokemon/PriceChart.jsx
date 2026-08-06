import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { getPriceTrend } from "@/lib/pokemonApi";

export default function PriceChart({ card }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(getPriceTrend(card));
  }, [card]);

  if (!data) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-500">
        No price trend available for this card yet.
      </div>
    );
  }

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const up = last >= first;
  const pct = first ? (((last - first) / first) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Price trend
        </div>
        <div className={`text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? "▲" : "▼"} {pct}%
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={28} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#181b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]}
            />
            <Line type="monotone" dataKey="price" stroke={up ? "#34d399" : "#f87171"} strokeWidth={2} dot={{ r: 3, fill: up ? "#34d399" : "#f87171" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] text-slate-500 mt-1">cardmarket rolling averages · 30d · 7d · 1d · now</div>
    </div>
  );
}