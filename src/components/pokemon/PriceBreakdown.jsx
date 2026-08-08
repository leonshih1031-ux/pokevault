import { useState } from "react";

const VARIANT_LABELS = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse Holo",
  "1stEditionNormal": "1st Edition Normal",
  "1stEditionHolofoil": "1st Edition Holo",
  "1stEditionReverseHolofoil": "1st Ed Reverse Holo",
};

// Standard market condition discounts (industry norms). Estimates, not TCGplayer direct.
const CONDITION_MULT = {
  "Mint": 1.0, "Near Mint": 1.0, "Lightly Played": 0.85, "Moderately Played": 0.70, "Heavily Played": 0.55, "Damaged": 0.40,
};

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function PriceBreakdown({ card }) {
  const [condition, setCondition] = useState("Near Mint");
  const tp = card?.tcgplayer?.prices || {};
  const variants = Object.keys(tp);

  if (!variants.length) {
    return <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-500">No TCGplayer pricing available for this card.</div>;
  }

  const refKey = variants.includes("normal") ? "normal" : variants[0];
  const refMarket = tp[refKey]?.market || tp[refKey]?.low || 0;
  const adjusted = refMarket * (CONDITION_MULT[condition] || 1);

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-slate-400">TCGplayer prices</div>
        <div className="text-[10px] text-slate-500">live market</div>
      </div>
      <div className="space-y-1.5">
        {variants.map((k) => {
          const v = tp[k];
          const m = v.market ?? v.low ?? 0;
          return (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{VARIANT_LABELS[k] || k}</span>
              <span className={`font-medium ${m > 0 ? "text-emerald-400" : "text-slate-600"}`}>{m > 0 ? money(m) : "—"}</span>
            </div>
          );
        })}
      </div>
      <div className="pt-2 border-t border-white/5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Condition estimate</span>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-8 px-2 text-xs">
            {Object.keys(CONDITION_MULT).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">≈ {VARIANT_LABELS[refKey] || refKey}, {condition}</span>
          <span className="font-semibold text-emerald-400">{money(adjusted)}</span>
        </div>
        <div className="text-[10px] text-slate-600 leading-relaxed">Condition values are estimates from standard market discounts. Graded (PSA/BGS/CGC) prices aren't available via the Pokémon TCG API — raw variant market prices are shown.</div>
      </div>
    </div>
  );
}