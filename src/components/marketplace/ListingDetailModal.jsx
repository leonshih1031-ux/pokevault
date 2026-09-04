import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, BadgeCheck, MapPin, Truck, Mail, Loader2, ShoppingCart, Check, MessageSquare, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRarityStyle } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/lib/cartContext";
import { Image } from "@/components/ui/image";
import VerifyScanDialog from "@/components/chat/VerifyScanDialog";

export default function ListingDetailModal({ open, onOpenChange, listing, mine, onChanged, onEdit }) {
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem, has } = useCart();
  if (!listing) return null;
  const inCart = has(listing.id);
  const style = getRarityStyle(listing.rarity);

  const markSold = async () => {
    setBusy(true);
    try {
      await base44.entities.MarketplaceListing.update(listing.id, { status: "sold" });
      toast({ title: "Marked as sold" });
      onChanged?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not update", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await base44.entities.MarketplaceListing.delete(listing.id);
      toast({ title: "Listing removed" });
      onChanged?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not delete", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addToCart = () => {
    addItem(listing);
    toast({ title: "Added to cart", description: "Go to the marketplace to checkout." });
    onOpenChange(false);
  };

  const messageSeller = () => {
    onOpenChange(false);
    navigate(`/messages?listing=${listing.id}`);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-2xl">
        <DialogHeader><DialogTitle className="font-display">{listing.name}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-[220px_1fr] gap-5">
          <div>
            <div className="rounded-xl overflow-hidden border border-white/10" style={{ boxShadow: `0 0 30px ${style.glow}` }}>
              <img src={listing.image_large || listing.image_small} alt={listing.name} className="w-full" />
            </div>
            <div className="mt-2 text-xs text-slate-500">{listing.set_name} · #{listing.number}</div>
            <div className="text-xs font-medium" style={{ color: style.color }}>{listing.rarity}</div>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-emerald-400">${(listing.asking_price || 0).toFixed(2)}</div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded bg-white/5">{listing.condition}</span>
              <span className="px-2 py-1 rounded bg-white/5">{listing.variant}</span>
              {listing.grading_company && listing.grading_company !== "Raw" && <span className="px-2 py-1 rounded bg-white/5">{listing.grading_company}{listing.grade ? ` ${listing.grade}` : ""}</span>}
              <span className="px-2 py-1 rounded bg-white/5">{listing.language || "English"}</span>
            </div>
            {listing.description && <p className="text-sm text-slate-300">{listing.description}</p>}
            <div className="space-y-1 text-xs text-slate-400">
              {listing.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {listing.location}</div>}
              {listing.shipping && <div className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {listing.shipping}</div>}
              <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Contact seller: {listing.created_by || "—"}</div>
            </div>
            {listing.proof_photos?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Proof photos</div>
                <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                  {listing.proof_photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0">
                      <div className="w-20 h-28 rounded-lg overflow-hidden border border-white/10">
                        <Image src={url} alt={`proof ${i + 1}`} fittingType="fit" className="w-full h-full" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {!mine && (() => {
          const feePercent = listing.platform_fee || 3;
          const cardPrice = listing.asking_price || 0;
          const platformFee = cardPrice * feePercent / 100;
          const total = cardPrice + platformFee;
          return (
            <div className="space-y-3 mt-2">
              <div className="rounded-lg bg-white/5 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Card price</span><span>${cardPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Platform fee ({feePercent}%)</span><span>${platformFee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-1.5"><span>Total</span><span className="text-emerald-400">${total.toFixed(2)}</span></div>
              </div>
              <Button onClick={addToCart} disabled={inCart} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
                {inCart ? <><Check className="w-4 h-4 mr-1.5" /> In Cart</> : <><ShoppingCart className="w-4 h-4 mr-1.5" /> Add to Cart · ${total.toFixed(2)}</>}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={messageSeller} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-slate-300"><MessageSquare className="w-4 h-4 mr-1.5" /> Message</Button>
                <Button onClick={() => setVerifyOpen(true)} variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-300"><ShieldCheck className="w-4 h-4 mr-1.5" /> Verify</Button>
              </div>
            </div>
          );
        })()}
        {mine && (
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => onEdit?.(listing)} disabled={busy} className="text-slate-300"><Pencil className="w-4 h-4 mr-1.5" /> Edit</Button>
            <Button variant="ghost" onClick={markSold} disabled={busy} className="text-emerald-300">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BadgeCheck className="w-4 h-4 mr-1.5" /> Mark Sold</>}</Button>
            <Button variant="ghost" onClick={remove} disabled={busy} className="text-red-300"><Trash2 className="w-4 h-4 mr-1.5" /> Delete</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
    <VerifyScanDialog open={verifyOpen} onOpenChange={setVerifyOpen} listing={listing} />
    </>
  );
}