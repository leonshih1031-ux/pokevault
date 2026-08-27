import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Store, Loader2, Search as SearchIcon, CreditCard, ShoppingCart, Trash2, MapPin, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getSets, getRarityStyle, CONDITIONS } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/lib/cart";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import ListingDetailModal from "@/components/marketplace/ListingDetailModal";
import CheckoutModal from "@/components/marketplace/CheckoutModal";
import AddressModal from "@/components/marketplace/AddressModal";

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState([]);
  const [userId, setUserId] = useState(null);
  const [me, setMe] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [condition, setCondition] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const { toast } = useToast();
  const { items, removeItem, clear, count } = useCart();

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.MarketplaceListing.list("-created_date", 200);
      setListings(all.filter((l) => l.status === "active"));
    } catch {
      toast({ title: "Could not load listings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getSets().then(setSets).catch(() => {});
    base44.auth.me().then((m) => { setUserId(m.id); setMe(m); }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast({ title: "Purchase complete!", description: "Your payment was processed successfully." });
    } else if (params.get("purchase") === "cancelled") {
      toast({ title: "Purchase cancelled", variant: "destructive" });
    }
  }, []);

  const connectStripe = async () => {
    setConnecting(true);
    try {
      const res = await base44.functions.invoke("createSellerStripeAccount", {});
      if (res.url) window.location.href = res.url;
    } catch {
      toast({ title: "Could not connect Stripe", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (query && !l.name?.toLowerCase().includes(query.toLowerCase())) return false;
      if (setId && l.set_id !== setId) return false;
      if (condition && l.condition !== condition) return false;
      return true;
    });
  }, [listings, query, setId, condition]);

  return (
    <div className="space-y-6 pk-fade-up">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Marketplace</div>
          <h1 className="font-bold text-2xl md:text-3xl">Card marketplace</h1>
          <p className="text-sm text-slate-400">Buy, sell, and trade cards with other collectors.</p>
        </div>
        <div className="flex items-center gap-2">
          {me && !me.seller_stripe_account_id && (
            <Button onClick={connectStripe} variant="outline" disabled={connecting} className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10">
              {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
              Connect Stripe
            </Button>
          )}
          <Button onClick={() => setAddressOpen(true)} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5">
            <MapPin className="w-4 h-4 mr-1.5" /> My Address
          </Button>
          <Button onClick={() => setCartOpen(true)} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 relative">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Cart
            {count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-[#0e1014] text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center">{count}</span>}
          </Button>
          <Button onClick={() => setCreating(true)} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]"><Plus className="w-4 h-4 mr-1.5" /> Create Listing</Button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cards…" className="bg-white/5 border-white/10 pl-9" />
        </div>
        <select value={setId} onChange={(e) => setSetId(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm">
          <option value="">All sets</option>
          {sets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm">
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center rounded-xl border border-dashed border-white/5">No active listings. Be the first to list a card!</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((l) => {
            const st = getRarityStyle(l.rarity);
            return (
              <button key={l.id} onClick={() => setSelected(l)} className="group rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/15 hover:bg-white/[0.04] transition-all text-left">
                <div className="aspect-[3/4] bg-black/30 relative">
                  <img src={l.image_small} alt={l.name} className="w-full h-full object-cover" />
                  {l.created_by_id === userId && <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-[#0e1014] font-semibold">Yours</span>}
                </div>
                <div className="p-2.5 space-y-1">
                  <div className="text-xs font-semibold leading-tight line-clamp-1">{l.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{l.set_name} · #{l.number}</div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">{l.condition}</span>
                    <span className="text-sm font-bold text-emerald-400">${(l.asking_price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <CreateListingModal open={creating} onOpenChange={setCreating} onSaved={load} />
      {selected && (
        <ListingDetailModal
          listing={selected}
          mine={selected.created_by_id === userId}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          onChanged={load}
          onEdit={(l) => { setSelected(null); setEditing(l); }}
        />
      )}
      {editing && (
        <CreateListingModal listing={editing} open={!!editing} onOpenChange={(o) => !o && setEditing(null)} onSaved={load} />
      )}

      {/* Cart panel */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-lg max-h-[80vh] overflow-y-auto scrollbar-thin">
          <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-400" /> Cart · {count} item{count !== 1 ? "s" : ""}</DialogTitle></DialogHeader>
          {items.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">Your cart is empty. Add cards from the marketplace!</div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
                  <img src={it.image_small} alt={it.name} className="w-10 h-14 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                    <div className="text-[11px] text-slate-500">{it.set_name} · #{it.number} · {it.condition}</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">${(it.asking_price || 0).toFixed(2)}</div>
                  </div>
                  <button onClick={() => removeItem(it.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-bold">${items.reduce((s, i) => s + (i.asking_price || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          {items.length > 0 && (
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
                <Truck className="w-4 h-4 mr-1.5" /> Checkout · ${items.reduce((s, i) => s + (i.asking_price || 0) + (i.asking_price * (i.platform_fee || 3) / 100), 0).toFixed(2)}
              </Button>
              <Button onClick={clear} variant="ghost" className="w-full text-slate-400">Clear cart</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} onPlaced={() => load()} />
      <AddressModal open={addressOpen} onOpenChange={setAddressOpen} onSaved={() => load()} />
    </div>
  );
}