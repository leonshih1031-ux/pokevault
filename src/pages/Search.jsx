import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import CardDetailModal from "@/components/pokemon/CardDetailModal";
import { searchCards, getSets, getCardPrice, getRarityStyle, RARITIES, POKEMON_TYPES } from "@/lib/pokemonApi";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [rarity, setRarity] = useState("");
  const [type, setType] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(36);
  const [loading, setLoading] = useState(false);
  const [sets, setSets] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => { getSets().then((s) => setSets(s.slice(0, 80))).catch(() => {}); }, []);

  const runSearch = async (p = 1) => {
    setLoading(true);
    try {
      const res = await searchCards({ query, setId, rarity, type, page: p, pageSize, orderBy: "-releaseDate" });
      setResults(res.cards || []); setTotal(res.totalCount || 0); setPage(p);
    } catch { setResults([]); setTotal(0); }
    finally { setLoading(false); }
  };

  useEffect(() => { runSearch(1); }, []);

  const pages = Math.min(Math.ceil(total / pageSize), 10);

  return (
    <div className="space-y-6 pk-fade-up">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><SearchIcon className="w-3.5 h-3.5" /> Card Search</div>
        <h1 className="font-bold text-2xl md:text-3xl">Find any card</h1>
        <p className="text-sm text-slate-400">Full Pokémon TCG database. Tip: try <span className="text-slate-300">Charizard 223/197</span>.</p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Card name or name + number…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch(1)} className="pl-9 bg-white/5 border-white/10" />
          </div>
          <Button onClick={() => runSearch(1)} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">Search</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={setId} onChange={(e) => setSetId(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-sm"><option value="">All sets</option>{sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-sm"><option value="">Any rarity</option>{RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-sm"><option value="">Any type</option>{POKEMON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <Button variant="ghost" onClick={() => { setQuery(""); setSetId(""); setRarity(""); setType(""); runSearch(1); }} className="border border-white/10">Reset</Button>
        </div>
      </div>

      <div className="text-xs text-slate-500">{loading ? "Searching…" : `${total} results`}</div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {results.map((card) => {
            const style = getRarityStyle(card.rarity);
            const price = getCardPrice(card);
            return (
              <button key={card.id} onClick={() => setActive(card)} className="group rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] hover:border-white/20 transition pk-fade-up">
                <div className="aspect-[3/4] relative">
                  <img src={card.images?.small} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/40 grid place-items-center"><span className="text-xs font-semibold">+ Add</span></div>
                  <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 16px ${style.glow}` }} />
                </div>
                <div className="p-1.5">
                  <div className="text-[10px] font-medium leading-tight line-clamp-1">{card.name}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[9px]" style={{ color: style.color }}>{card.rarity || ""}</span>
                    {price > 0 && <span className="text-[9px] font-semibold text-emerald-400">${price.toFixed(2)}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => runSearch(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-slate-400">Page {page} / {pages}</span>
          <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => runSearch(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {active && <CardDetailModal card={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />}
    </div>
  );
}