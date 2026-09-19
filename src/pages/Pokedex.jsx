import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Search as SearchIcon, Grid3x3, ChevronRight, ChevronDown } from "lucide-react";
import { getRarityStyle } from "@/lib/pokemonApi";
import { getSpeciesName, groupBySpecies } from "@/lib/species";

const money = (n) => `$${(n || 0).toFixed(2)}`;

export default function Pokedex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.CollectionCard.list("-updated_date", 500);
        setItems(list);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const species = useMemo(() => {
    const groups = groupBySpecies(items, (c) => c.current_price || 0);
    return groups;
  }, [items]);

  const filtered = useMemo(() => {
    if (!query.trim()) return species;
    const q = query.toLowerCase();
    return species.filter((s) => s.species.toLowerCase().includes(q));
  }, [species, query]);

  const totalSpecies = species.length;
  const totalCards = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const totalValue = items.reduce((s, i) => s + (i.current_price || 0) * (i.quantity || 1), 0);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-6 pk-fade-up">
      <header>
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1"><Grid3x3 className="w-3.5 h-3.5" /> Pokédex</div>
        <h1 className="font-bold text-2xl md:text-3xl">Species Collection</h1>
        <p className="text-sm text-slate-400 mt-1">Browse every card you own, grouped by Pokémon — just like the Pokédex.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Species" value={String(totalSpecies)} />
        <MiniStat label="Total Cards" value={String(totalCards)} />
        <MiniStat label="Collection Value" value={money(totalValue)} accent="text-emerald-400" />
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          placeholder="Search species…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
          <div className="text-slate-400 mb-1">{items.length === 0 ? "No cards in your collection yet" : "No species match your search"}</div>
          {items.length === 0 && <a href="/search" className="text-emerald-400 text-sm hover:underline">Search for cards to add →</a>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => {
            const isOpen = expanded === g.species;
            const style = getRarityStyle(g.bestCard?.rarity);
            return (
              <div key={g.species} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : g.species)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] transition text-left"
                >
                  <div className="w-14 h-16 rounded-lg overflow-hidden shrink-0 relative">
                    <img src={g.bestCard?.image_small} alt={g.species} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 14px ${style.glow}` }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{g.species}</div>
                    <div className="text-xs text-slate-500">{g.count} card{g.count !== 1 ? "s" : ""} · {g.cards.length} variant{g.cards.length !== 1 ? "s" : ""}</div>
                    <div className="text-xs font-semibold text-emerald-400 mt-0.5">{money(g.value)}</div>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
                      {g.cards.map((c) => {
                        const cs = getRarityStyle(c.rarity);
                        const val = (c.current_price || 0) * (c.quantity || 1);
                        return (
                          <div key={c.id} className="rounded-lg overflow-hidden border border-white/5 bg-white/[0.02]">
                            <div className="aspect-[3/4] relative">
                              <img src={c.image_small} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                              {c.quantity > 1 && <div className="absolute top-0.5 right-0.5 px-1 rounded bg-black/70 text-[8px] font-bold text-white">×{c.quantity}</div>}
                              <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 10px ${cs.glow}` }} />
                            </div>
                            <div className="p-1">
                              <div className="text-[8px] font-medium leading-tight line-clamp-1">{c.name}</div>
                              <div className="text-[8px] font-semibold text-emerald-400">{val > 0 ? money(val) : "—"}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-bold text-lg ${accent || ""}`}>{value}</div>
    </div>
  );
}