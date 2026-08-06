import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Heart, Repeat2, Trash2, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { getRarityStyle } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("wishlist");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { const list = await base44.entities.WishlistItem.list("-created_date", 200); setItems(list); } catch {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => (i.list_type || "wishlist") === tab);
  const remove = async (id) => {
    try { await base44.entities.WishlistItem.delete(id); setItems((l) => l.filter((i) => i.id !== id)); toast({ title: "Removed" }); } catch {}
  };

  return (
    <div className="space-y-6 pk-fade-up">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Lists</div>
          <h1 className="font-bold text-2xl md:text-3xl">Wishlist & Trades</h1>
        </div>
        <Link to="/search" className="text-sm text-emerald-400 hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Find cards</Link>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5">
          <TabsTrigger value="wishlist"><Heart className="w-4 h-4 mr-1.5" /> Wishlist</TabsTrigger>
          <TabsTrigger value="trade"><Repeat2 className="w-4 h-4 mr-1.5" /> Trade Binder</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {loading ? (
            <div className="grid place-items-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/10">
              <div className="text-slate-400 mb-1">{tab === "wishlist" ? "Your wishlist is empty" : "Your trade binder is empty"}</div>
              <Link to="/search" className="text-emerald-400 text-sm hover:underline">Search for cards to add →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filtered.map((c) => {
                const style = getRarityStyle(c.rarity);
                return (
                  <div key={c.id} className="group relative rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] pk-fade-up">
                    <div className="aspect-[3/4] relative">
                      <img src={c.image_small} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 16px ${style.glow}` }} />
                      <button onClick={() => remove(c.id)} className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/70 grid place-items-center opacity-0 group-hover:opacity-100 transition text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="p-1.5">
                      <div className="text-[10px] font-medium leading-tight line-clamp-1">{c.name}</div>
                      <div className="text-[9px]" style={{ color: style.color }}>{c.rarity}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}