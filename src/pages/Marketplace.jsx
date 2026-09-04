import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Store, Loader2, Search as SearchIcon, CreditCard, MapPin } from "lucide-react";
import { getSets, getRarityStyle, CONDITIONS } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import ListingDetailModal from "@/components/marketplace/ListingDetailModal";
import CartButton from "@/components/marketplace/CartButton";
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
  const [addressOpen, setAddressOpen] = useState(false);
  const { toast } = useToast();

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
            <Button onClick={connectStripe} variant="outline" disabled={connecting} className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-300">
              {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
              Connect Stripe
            </Button>
          )}
          <Button onClick={() => setAddressOpen(true)} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-slate-300">
            <MapPin className="w-4 h-4 mr-1.5" /> My Address
          </Button>
          <CartButton variant="header" />
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

      <AddressModal open={addressOpen} onOpenChange={setAddressOpen} onSaved={() => load()} />
    </div>
  );
}