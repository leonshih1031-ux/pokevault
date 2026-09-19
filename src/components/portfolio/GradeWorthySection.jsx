import { useMemo } from "react";
import { getRarityStyle } from "@/lib/pokemonApi";
import { Award, ChevronRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const money = (n) => `$${(n || 0).toFixed(2)}`;

// Heuristic grading-upside estimator. The Pokémon TCG API doesn't provide
// graded prices, so we estimate PSA 10 value from raw market price using
// community-documented multiples:
//   - High-value raw cards ($50+): PSA 10 ≈ 1.8× raw (modern era average)
//   - Mid-value ($20–50): PSA 10 ≈ 2.5× raw (higher multiple, lower absolute)
//   - Low-value ($5–20): PSA 10 ≈ 3× raw (cheap cards with big percentage pops)
// Grading cost is ~$22/card (PSA Value bulk). Cards below $5 raw aren't worth
// the grading fee. Returns estimated profit = PSA10 value - raw - grading cost.
const GRADING_COST = 22;

function estimateUpside(card) {
  const raw = card.current_price || 0;
  if (raw < 5) return null;
  const isGraded = card.grading_company && card.grading_company !== "Raw";
  if (isGraded) return null;

  let multiple;
  if (raw >= 50) multiple = 1.8;
  else if (raw >= 20) multiple = 2.5;
  else multiple = 3.0;

  const psa10 = raw * multiple;
  const profit = psa10 - raw - GRADING_COST;
  const roi = raw > 0 ? (profit / raw) * 100 : 0;
  return { raw, psa10, profit, roi, multiple };
}

export default function GradeWorthySection({ items }) {
  const gradeWorthy = useMemo(() => {
    return items
      .map((c) => ({ card: c, upside: estimateUpside(c) }))
      .filter((x) => x.upside && x.upside.profit > 0)
      .sort((a, b) => b.upside.profit - a.upside.profit)
      .slice(0, 6);
  }, [items]);

  if (gradeWorthy.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <div className="font-semibold">Grade Worthy</div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">Raw cards with strong grading upside</span>
        </div>
        <Link to="/binder" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">View binder <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {gradeWorthy.map(({ card, upside }) => {
          const style = getRarityStyle(card.rarity);
          return (
            <div key={card.id} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
              <div className="aspect-[3/4] relative">
                <img src={card.image_small} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 18px ${style.glow}` }} />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-[9px] font-bold text-black flex items-center gap-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" /> {upside.roi.toFixed(0)}%
                </div>
              </div>
              <div className="p-2 space-y-0.5">
                <div className="text-[10px] font-medium leading-tight line-clamp-1">{card.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-500">Raw {money(upside.raw)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-amber-400 font-semibold">Est PSA 10 {money(upside.psa10)}</span>
                </div>
                <div className="text-[9px] font-bold text-emerald-400">+{money(upside.profit)} profit</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-600 mt-3">Estimates based on community PSA 10 multiples. Grading cost est. ${GRADING_COST}/card. Not financial advice.</div>
    </section>
  );
}