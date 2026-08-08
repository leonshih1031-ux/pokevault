import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Repeat2, Plus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getCardPrice, getRarityStyle, CONDITIONS, VARIANTS } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";
import PriceHistoryChart from "@/components/pokemon/PriceHistoryChart";
import PriceBreakdown from "@/components/pokemon/PriceBreakdown";
import { autoTickFromBinder } from "@/lib/setlist";

export default function CardDetailModal({ card, open, onOpenChange }) {
  const [qty, setQty] = useState(1);
  const [condition, setCondition] = useState("Near Mint");
  const [variant, setVariant] = useState("Normal");
  const [price, setPrice] = useState(0);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && card) {
      setPrice(getCardPrice(card) || 0);
      setQty(1); setCondition("Near Mint"); setVariant("Normal");
    }
  }, [open, card]);

  const addCollection = async () => {
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await base44.entities.CollectionCard.create({
        card_id: card.id, name: card.name, set_id: card.set?.id, set_name: card.set?.name, number: card.number,
        image_small: card.images?.small, image_large: card.images?.large, rarity: card.rarity, types: card.types || [], supertype: card.supertype,
        quantity: Number(qty) || 1, condition, variant, language: "English", grading_company: "Raw",
        purchase_price: Number(price) || 0, date_acquired: today, current_price: getCardPrice(card), folder: "Main",
      });
      toast({ title: "Added to binder" });
      autoTickFromBinder([card]);
      onOpenChange(false);
    } catch { toast({ title: "Could not add", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const addToList = async (list_type) => {
    setBusy(true);
    try {
      await base44.entities.WishlistItem.create({
        card_id: card.id, name: card.name, set_id: card.set?.id, set_name: card.set?.name, number: card.number,
        image_small: card.images?.small, image_large: card.images?.large, rarity: card.rarity,
        priority: "Medium", list_type,
      });
      toast({ title: list_type === "trade" ? "Added to trade binder" : "Added to wishlist" });
      onOpenChange(false);
    } catch { toast({ title: "Could not add", variant: "destructive" }); }
    finally { setBusy(false); }
  };

  if (!card) return null;
  const style = getRarityStyle(card.rarity);
  const priceVal = getCardPrice(card);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-2xl">
        <DialogHeader><DialogTitle className="font-display">{card.name}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-[200px_1fr] gap-5">
          <div>
            <div className="rounded-xl overflow-hidden border border-white/10" style={{ boxShadow: `0 0 30px ${style.glow}` }}>
              <img src={card.images?.large || card.images?.small} alt={card.name} className="w-full" />
            </div>
            <div className="mt-2 text-xs text-slate-500">{card.set?.name} · #{card.number}</div>
            <div className="text-xs font-medium" style={{ color: style.color }}>{card.rarity}</div>
            {priceVal > 0 && <div className="mt-1 text-sm font-semibold text-emerald-400">≈ ${priceVal.toFixed(2)}</div>}
          </div>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-slate-500">Add to your binder</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="bg-white/5 border-white/10" /></Field>
              <Field label="Purchase Price ($)"><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-white/5 border-white/10" /></Field>
              <Field label="Condition"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Variant"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={variant} onChange={(e) => setVariant(e.target.value)}>{VARIANTS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            </div>
          </div>
        </div>
        <PriceHistoryChart card={card} />
        <PriceBreakdown card={card} />
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => addToList("wishlist")} disabled={busy} className="text-blue-300"><Heart className="w-4 h-4 mr-1.5" /> Wishlist</Button>
            <Button variant="ghost" onClick={() => addToList("trade")} disabled={busy} className="text-amber-300"><Repeat2 className="w-4 h-4 mr-1.5" /> Trade</Button>
          </div>
          <Button onClick={addCollection} disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1.5" /> Add to Binder</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Label>{children}</div>;
}