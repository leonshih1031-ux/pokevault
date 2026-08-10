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
          // Prefer the record with a valid price when deduping by card_id.
          const prev = latestByCard.get(h.card_id);
          if (!prev || (h.price > 0 && !(prev.price > 0))) latestByCard.set(h.card_id, h);
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
  const MAX = 6;
  const pickTop = (list, dir) =>
    [...list].filter((m) => (dir === "up" ? m.pct > 0 : m.pct < 0))
      .sort((a, b) => (dir === "up" ? b.pct - a.pct : a.pct - b.pct))
      .slice(0, MAX);

  const colGainers = ready ? pickTop(movers.collection, "up") : [];
  const colLosers = ready ? pickTop(movers.collection, "down") : [];
  const mktGainers = ready ? pickTop(movers.market, "up") : [];
  const mktLosers = ready ? pickTop(movers.market, "down") : [];

  const MoverRow = ({ m, dir }) => {
    const up = dir === "up";
    const style = getRarityStyle(m.rarity);
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2">
        <div className="relative w-9 h-11 shrink-0 rounded overflow-hidden">
          <img src={m.image_small} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 10px ${style.glow}` }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{m.name}</div>
          <div className="text-[10px] text-slate-500">{money(m.prev)} → {money(m.last)}</div>
        </div>
        <div className={`text-xs font-semibold shrink-0 ${up ? "text-emerald-400" : "text-red-400"}`}>
          {m.pct > 0 ? "+" : ""}{m.pct.toFixed(1)}%
        </div>
      </div>
    );
  };

  const List = ({ items, dir, label, icon, accent }) => (
    <div>
      <div className={`flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest ${accent}`}>
        {icon}{label}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center rounded-xl border border-dashed border-white/5">
          No eligible cards yet
        </div>
      ) : (
        <div className="space-y-2">{items.map((m) => <MoverRow key={m.id} m={m} dir={dir} />)}</div>
      )}
    </div>
  );

  const Section = ({ title, subtitle, gainers, losers }) => (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="mb-4">
        <div className="font-semibold">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
      </div>
      <div className="space-y-4">
        <List items={gainers} dir="up" label="Top Gainers" icon={<TrendingUp className="w-3 h-3" />} accent="text-emerald-400" />
        <List items={losers} dir="down" label="Top Losers" icon={<TrendingDown className="w-3 h-3" />} accent="text-red-400" />
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
            gainers={colGainers}
            losers={colLosers}
          />
          <Section
            title="Entire Market"
            subtitle="Biggest swings across all tracked cards"
            gainers={mktGainers}
            losers={mktLosers}
          />
        </div>
      )}
    </section>
  );
}