import { useEffect, useState } from "react";
import { Newspaper, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { searchCards } from "@/lib/pokemonApi";

// Curated queries for iconic rare cards across famous sets — guarantees a
// visually striking, varied table of real chase cards every load.
const RARE_QUERIES = [
  { setId: "sv3pt5", rarity: "Special Illustration Rare", label: "151 SIR" },
  { setId: "swsh7", rarity: "Rare Ultra", label: "Evolving Skies" },
  { setId: "sv3", rarity: "Special Illustration Rare", label: "Obsidian Flames" },
  { setId: "swsh9", rarity: "Rare Secret", label: "Brilliant Stars" },
];

export default function NewsBanner({ onRefresh, refreshing }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Fetch one page from each curated query in parallel, then shuffle the pool.
        const results = await Promise.all(
          RARE_QUERIES.map((q) => searchCards({ setId: q.setId, rarity: q.rarity, pageSize: 8 }))
        );
        const pool = results.flatMap((r) => r.cards).filter((c) => c.images?.small);
        // Shuffle and take 14 for a rich table.
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        if (alive) setCards(pool.slice(0, 14));
      } catch {
        // graceful — banner still renders with gradient
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <section className="relative rounded-2xl overflow-hidden border border-white/5 h-44 md:h-56">
      {/* Real rare card table */}
      <div className="absolute inset-0 bg-[#0e1116]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400/60 animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-wrap content-start gap-1 p-1 opacity-60">
            {cards.map((c, i) => (
              <img
                key={c.id + i}
                src={c.images.small}
                alt={c.name}
                loading="lazy"
                className="h-[calc(50%-4px)] w-auto object-contain rounded-sm shadow-lg"
                style={{ transform: `rotate(${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg)` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d10] via-[#0b0d10]/70 to-[#0b0d10]/30" />
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1">
          <Newspaper className="w-3.5 h-3.5" /> News & Articles
        </div>
        <h1 className="font-bold text-2xl md:text-4xl tracking-tight drop-shadow-lg">Pokémon TCG news</h1>
        <p className="text-sm text-slate-200 mt-1 max-w-xl drop-shadow">Latest set releases, reveals, price moves, and tournament news — pulled live from the web.</p>
      </div>
      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={refreshing}
        className="absolute top-4 right-4 bg-black/40 border-white/20 backdrop-blur hover:bg-black/60"
      >
        {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        Refresh
      </Button>
    </section>
  );
}