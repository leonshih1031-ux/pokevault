import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

// Premium-rarity mover filter.
// Double Rare (Scarlet/Violet ex) cards only qualify with a significant (>10%) move.
// All other above-Rare rarities always qualify.
function isMoverEligible(rarity, pct) {
  const r = (rarity || "").toLowerCase().trim();
  if (!r) return false;
  if (["common", "uncommon", "rare"].includes(r)) return false;
  if (r === "double rare") return pct != null && pct > 10;
  return true;
}

export default function MoversSection({ items }) {
  const [movers, setMovers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const collectionIds = new Set((items || []).map((i) => i.card_id));
      try {
        const hist = await base44.entities.CardPriceHistory.list("-snapshot_date", 500);
        if (cancelled) return;
        const latestByCard = new Map();
        const allByCard = {};
        for (const h of hist) {
          if (!latestByCard.has(h.card_id)) latestByCard.set(h.card_id, h);
          (allByCard[h.card_id] ||= []).push(h);
        }
        const buildMover = (latest, cid) => {
          let pct = latest.pct_30d;
          let prev = null;
          const snaps = (allByCard[cid] || []).filter((s) => s.price > 0);
          if (snaps.length >= 2) prev = snaps[snaps.length - 1].price;
          if (pct == null && snaps.length >= 2) {
            const earliest = snaps[snaps.length - 1];
            const latestNz = snaps[0];
            if (earliest.snapshot_date !== latestNz.snapshot_date) {
              pct = (latestNz.price / earliest.price - 1) * 100;
              prev = earliest.price;
            }
          }
          if (pct == null || latest.price <= 0) return null;
          if (!isMoverEligible(latest.rarity, pct)) return null;
          return {
            id: cid, card_id: cid,
            name: latest.name, image_small: latest.image_small,
            rarity: latest.rarity, pct, prev: prev ?? latest.price, last: latest.price,
          };
        };
        const collectionMovers = [];
        const marketMovers = [];
        for (const [cid, latest] of latestByCard) {
          const m = buildMover(latest, cid);
          if (!m) continue;
          if (collectionIds.has(cid)) collectionMovers.push(m);
          marketMovers.push(m);
        }
        setMovers({ collection: collectionMovers, market: marketMovers });
      } catch {
        if (!cancelled) setMovers({ collection: [], market: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [items]);

  const ready = movers !== null;
  const pick = (list, dir) => {
    const sorted = [...list].sort((a, b) => (dir === "up" ? b.pct - a.pct : a.pct - b.pct));
    return sorted[0] || null;
  };

  const colGainer = ready ? pick(movers.collection, "up") : null;
  const colLoser = ready ? pick(movers.collection, "down") : null;
  const mktGainer = ready ? pick(movers.market, "up") : null;
  const mktLoser = ready ? pick(movers.market, "down") : null;

  const MoverCard = ({ m, dir }) => {
    const up = dir === "up";
    const style = getRarityStyle(m?.rarity);
    if (!m) return (
      <div className="flex-1 rounded-xl border border-dashed border-white/5 p-4 text-center text-xs text-slate-500">
        No eligible card yet
      </div>
    );
    return (
      <div className="flex-1 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="relative w-12 h-14 shrink-0 rounded overflow-hidden">
          <img src={m.image_small} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 12px ${style.glow}` }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{m.name}</div>
          <div className="text-[11px] text-slate-500">{money(m.prev)} → {money(m.last)}</div>
          <div className={`text-sm font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? "+" : ""}{m.pct.toFixed(1)}%
          </div>
        </div>
        {up ? <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" /> : <TrendingDown className="w-5 h-5 text-red-400 shrink-0" />}
      </div>
    );
  };

  const Section = ({ title, subtitle, gainer, loser }) => (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="mb-4">
        <div className="font-semibold">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest text-emerald-400"><TrendingUp className="w-3 h-3" /> Biggest Gainer</div>
          <MoverCard m={gainer} dir="up" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest text-red-400"><TrendingDown className="w-3 h-3" /> Biggest Loser</div>
          <MoverCard m={loser} dir="down" />
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="font-semibold text-lg">Biggest Movers <span className="text-[10px] font-normal text-slate-500 ml-1">Premium rarities · 30-day market change</span></div>
      {!ready ? (
        <div className="grid place-items-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          <Section
            title="Your Collection"
            subtitle="Biggest swings among cards you own"
            gainer={colGainer}
            loser={colLoser}
          />
          <Section
            title="Entire Market"
            subtitle="Biggest swings across all tracked cards"
            gainer={mktGainer}
            loser={mktLoser}
          />
        </div>
      )}
    </section>
  );
}