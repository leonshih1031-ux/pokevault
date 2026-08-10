import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRarityStyle } from "@/lib/pokemonApi";

const money = (n) => `$${(n || 0).toFixed(2)}`;

// Premium-rarity mover filter.
// Double Rare (Scarlet/Violet ex) cards only qualify with a significant (>10%) move.
// All other above-Rare rarities always qualify: Illustration Rare, Special
// Illustration Rare, Ultra Rare, Hyper Rare, ACE SPEC, Rare Holo V/VMAX/VSTAR,
// Rare Holo EX/GX, Rare Secret, Amazing Rare, Radiant Rare, Shiny Rare, Promo,
// vintage holos, BW-era ex, XY-era full-art ex, S&S full art / Trainer Gallery.
// Commons, uncommons and plain Rares are excluded.
function isMoverEligible(rarity, pct) {
  const r = (rarity || "").toLowerCase().trim();
  if (!r) return false;
  if (r === "common" || r === "uncommon") return false;
  if (r === "rare") return false; // plain Rare is the cutoff, not included
  if (r === "double rare") {
    return pct != null && pct > 10;
  }
  return true;
}

export default function MoversSection({ items }) {
  const [movers, setMovers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hist = await base44.entities.CardPriceHistory.list("-snapshot_date", 500);
        if (cancelled) return;
        const latestByCard = new Map();
        const allByCard = {};
        for (const h of hist) {
          if (!latestByCard.has(h.card_id)) latestByCard.set(h.card_id, h);
          (allByCard[h.card_id] ||= []).push(h);
        }
        const out = [];
        for (const [cid, latest] of latestByCard) {
          let pct = latest.pct_30d;
          let prev = null;
          const snaps = (allByCard[cid] || []).filter((s) => s.price > 0);
          if (snaps.length >= 2) prev = snaps[snaps.length - 1].price;
          // Fallback: own snapshot history when cardmarket 30d trend is missing.
          if (pct == null && snaps.length >= 2) {
            const earliest = snaps[snaps.length - 1];
            const latestNz = snaps[0];
            if (earliest.snapshot_date !== latestNz.snapshot_date) {
              pct = (latestNz.price / earliest.price - 1) * 100;
              prev = earliest.price;
            }
          }
          if (pct == null || latest.price <= 0) continue;
          // Premium-rarity filter: Double Rares need >10%, others always qualify.
          if (!isMoverEligible(latest.rarity, pct)) continue;
          out.push({
            id: cid,
            card_id: cid,
            name: latest.name,
            image_small: latest.image_small,
            rarity: latest.rarity,
            pct, prev: prev ?? latest.price, last: latest.price,
          });
        }
        setMovers(out);
      } catch {
        if (!cancelled) setMovers([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const ready = movers !== null;
  const gainers = ready ? movers.filter((m) => m.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 6) : [];
  const losers = ready ? movers.filter((m) => m.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 6) : [];

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
        ? <div className="text-xs text-slate-500 py-6 text-center rounded-xl border border-dashed border-white/5">No premium-rarity cards with price movement yet — movers appear as market data accumulates.</div>
        : <div className="space-y-2">{list.map((m) => <Row key={m.id} m={m} />)}</div>}
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="font-semibold mb-4">Biggest Movers <span className="text-[10px] font-normal text-slate-500 ml-1">Premium rarities · 30-day market change</span></div>
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