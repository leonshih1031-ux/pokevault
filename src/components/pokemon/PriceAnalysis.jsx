import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getPriceTrend, getCardPrice } from "@/lib/pokemonApi";
import { buildPrediction, dayToLabel } from "@/lib/pricePrediction";

/**
 * PriceAnalysis — shows 30-day real price history + a 30-day-forward linear
 * regression projection. The projection is pure least-squares math on actual
 * recorded daily snapshots — no LLM, no speculation, no external API.
 *
 * Confidence (R²) tells you how much to trust the projection:
 *   strong ≥ 0.7 · moderate ≥ 0.4 · low < 0.4
 */
export default function PriceAnalysis({ card }) {
  const [history, setHistory] = useState(null);   // real snapshots
  const [trend, setTrend] = useState(null);       // cardmarket fallback
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1. Real daily snapshots from CardPriceHistory (most accurate)
        const hist = await base44.entities.CardPriceHistory.filter(
          { card_id: card.id },
          "snapshot_date",
          90
        );
        if (cancelled) return;
        setHistory(hist || []);

        // 2. Cardmarket rolling-avg fallback (30d → now, 4 points)
        let t = getPriceTrend(card);
        if ((!t || t.length < 2) && card.id) {
          try {
            const r = await fetch(
              `https://api.pokemontcg.io/v2/cards/${card.id}`,
              { headers: { Accept: "application/json" } }
            );
            if (cancelled) return;
            if (r.ok) {
              const full = (await r.json()).data;
              t = full ? getPriceTrend(full) : t;
            }
          } catch {}
        }
        if (!cancelled) setTrend(t);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [card]);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 grid place-items-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  const currentPrice = getCardPrice(card);
  const prediction = buildPrediction(history, 30);

  // --- Case A: we have enough real snapshots for a regression projection ---
  if (prediction) {
    const firstDate = history
      .slice()
      .sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date))[0]
      ?.snapshot_date;

    const chartData = [
      ...prediction.points.map((p) => ({
        label: dayToLabel(p.x, firstDate),
        price: Number(p.y.toFixed(2)),
        projected: null,
      })),
      // Bridge point at last real date with both real + projected value
      {
        label: dayToLabel(prediction.points[prediction.points.length - 1].x, firstDate),
        price: Number(prediction.currentPrice.toFixed(2)),
        projected: Number(prediction.currentPrice.toFixed(2)),
      },
      // 30-day-forward projection point
      {
        label: dayToLabel(prediction.projection[1].x, firstDate),
        price: null,
        projected: Number(prediction.predictedPrice.toFixed(2)),
      },
    ];

    const changePct = prediction.currentPrice
      ? ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice) * 100
      : 0;
    const dir = changePct > 1 ? "up" : changePct < -1 ? "down" : "flat";
    const DirIcon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
    const dirColor = dir === "up" ? "text-emerald-400" : dir === "down" ? "text-red-400" : "text-slate-400";

    const confLabel = {
      strong: { label: "Strong fit", color: "text-emerald-400", bg: "bg-emerald-400/10" },
      moderate: { label: "Moderate fit", color: "text-amber-400", bg: "bg-amber-400/10" },
      low: { label: "Weak fit", color: "text-red-400", bg: "bg-red-400/10" },
    }[prediction.confidence];

    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> 30-Day Forecast
          </div>
          <div className={`text-xs font-semibold ${dirColor} flex items-center gap-1`}>
            <DirIcon className="w-3.5 h-3.5" />
            {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% projected
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Now" value={`$${prediction.currentPrice.toFixed(2)}`} />
          <Stat label="30d Projected" value={`$${prediction.predictedPrice.toFixed(2)}`} accent={dirColor} />
          <Stat label="Data Points" value={String(prediction.dataPoints)} />
        </div>

        {/* Chart: real (solid) + projection (dashed) */}
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} width={36} domain={["auto", "auto"]} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: "#181b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v, name) => name === "projected" ? [`$${Number(v).toFixed(2)}`, "Projected"] : [`$${Number(v).toFixed(2)}`, "Actual"]}
              />
              <ReferenceLine y={prediction.currentPrice} stroke="rgba(148,163,184,0.2)" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="price" stroke="#34d399" strokeWidth={2} dot={{ r: 2, fill: "#34d399" }} connectNulls={false} />
              <Line type="monotone" dataKey="projected" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: "#fbbf24" }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence + methodology */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${confLabel.bg} ${confLabel.color} font-medium`}>
            {confLabel.label} · R² = {prediction.r2.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500">
            Linear regression on {prediction.dataPoints} daily snapshots · {prediction.spanDays}d span
          </span>
        </div>
        {prediction.confidence === "low" && (
          <div className="flex items-start gap-1.5 text-[10px] text-amber-400/80">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Weak trend correlation — price is volatile or flat. Projection may not be reliable.</span>
          </div>
        )}
        <div className="text-[9px] text-slate-600 leading-tight">
          Statistical projection from real recorded prices. Past performance does not guarantee future results.
        </div>
      </div>
    );
  }

  // --- Case B: not enough real snapshots — show cardmarket trend if available ---
  if (trend && trend.length >= 2) {
    const first = trend[0].price, last = trend[trend.length - 1].price;
    const up = last >= first;
    const pct = first ? (((last - first) / first) * 100).toFixed(1) : "0.0";
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Price Trend
          </div>
          <div className={`text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "▲" : "▼"} {pct}%
          </div>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={32} domain={["auto", "auto"]} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} />
              <Tooltip contentStyle={{ background: "#181b22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#94a3b8" }} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Price"]} />
              <Line type="monotone" dataKey="price" stroke={up ? "#34d399" : "#f87171"} strokeWidth={2} dot={{ r: 2.5, fill: up ? "#34d399" : "#f87171" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[10px] text-slate-500">
          cardmarket rolling averages · 30d → now · {trend.length} data points
        </div>
        <div className="flex items-start gap-1.5 text-[10px] text-slate-500">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Forecast needs 5+ daily snapshots. This card has {history?.length || 0} — accumulate history via daily snapshots for a regression forecast.</span>
        </div>
      </div>
    );
  }

  // --- Case C: no data at all ---
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
      <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" /> Price History
      </div>
      {currentPrice > 0 ? (
        <div className="text-sm text-slate-300">
          Current market price: <span className="font-semibold text-emerald-400">${currentPrice.toFixed(2)}</span>
        </div>
      ) : (
        <div className="text-sm text-slate-500">No market price data available for this card.</div>
      )}
      <div className="text-[10px] text-slate-500">
        Price history accumulates as daily snapshots are recorded. Come back after a few days for a trend chart and 30-day forecast.
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${accent || "text-slate-100"}`}>{value}</div>
    </div>
  );
}