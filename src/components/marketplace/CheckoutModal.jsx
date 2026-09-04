import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Truck, Package, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/lib/cartContext";
import { SHIPPING_COMPANIES, COUNTRIES, calculateShipping } from "@/lib/shipping";
import { useToast } from "@/components/ui/use-toast";

export default function CheckoutModal({ open, onOpenChange, onPlaced }) {
  const { items, clear } = useCart();
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", country: "", address: "", city: "", state: "", postal_code: "", phone: "",
  });
  const [shippingCompany, setShippingCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then((m) => {
      setMe(m);
      setForm((f) => ({
        ...f,
        name: m.full_name || "",
        email: m.email || "",
        country: m.country || "",
        address: m.address_line || "",
        city: m.city || "",
        state: m.state_region || "",
        postal_code: m.postal_code || "",
        phone: m.phone || "",
      }));
    }).catch(() => {});
  }, [open]);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const subtotal = items.reduce((s, i) => s + (i.asking_price || 0), 0);
  const fees = items.reduce((s, i) => s + (i.asking_price * (i.platform_fee || 3) / 100), 0);
  const shippingCost = shippingCompany ? calculateShipping(items.length, shippingCompany) : 0;
  const total = subtotal + fees + shippingCost;

  const submit = async () => {
    if (window.self !== window.top) {
      toast({ title: "Checkout works only from a published app", variant: "destructive" });
      return;
    }
    if (!form.name || !form.country || !form.address) {
      toast({ title: "Fill in name, country and address", variant: "destructive" });
      return;
    }
    if (!shippingCompany) {
      toast({ title: "Choose a shipping company", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("createMarketplaceCheckout", {
        listing_ids: items.map((i) => i.id),
        shipping: form,
        shipping_company: shippingCompany,
        notes,
      });
      if (res.url) {
        clear();
        window.location.href = res.url;
      } else {
        toast({ title: res.error || "Could not start checkout", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: err.message || "Could not start checkout", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Truck className="w-5 h-5 text-emerald-400" /> Checkout · {items.length} item{items.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">Your cart is empty.</div>
        ) : (
          <div className="space-y-5">
            {/* Cart items */}
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
                  <img src={it.image_small} alt={it.name} className="w-10 h-14 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                    <div className="text-[11px] text-slate-500">{it.set_name} · #{it.number} · {it.condition}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">${(it.asking_price || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Shipping address */}
            <div className="space-y-3">
              <div className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-400" /> Shipping Address</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name"><Input value={form.name} onChange={upd("name")} className="bg-white/5 border-white/10" /></Field>
                <Field label="Email"><Input value={form.email} onChange={upd("email")} className="bg-white/5 border-white/10" /></Field>
                <Field label="Country" full>
                  <select value={form.country} onChange={upd("country")} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm w-full">
                    <option value="">Select country…</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Street Address" full><Input value={form.address} onChange={upd("address")} placeholder="123 Main St, Apt 4B" className="bg-white/5 border-white/10" /></Field>
                <Field label="City"><Input value={form.city} onChange={upd("city")} className="bg-white/5 border-white/10" /></Field>
                <Field label="State / Region"><Input value={form.state} onChange={upd("state")} className="bg-white/5 border-white/10" /></Field>
                <Field label="Postal Code"><Input value={form.postal_code} onChange={upd("postal_code")} className="bg-white/5 border-white/10" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={upd("phone")} className="bg-white/5 border-white/10" /></Field>
              </div>
            </div>

            {/* Shipping company */}
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4 text-emerald-400" /> Shipping Company</div>
              <select value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm w-full">
                <option value="">Choose a shipping company…</option>
                {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Notes */}
            <Field label="Notes for seller (optional)" full>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Special delivery instructions, bundle notes, etc." className="bg-white/5 border border-white/10 rounded-md w-full px-3 py-2 text-sm" />
            </Field>

            {/* Totals */}
            <div className="rounded-lg bg-white/5 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Subtotal ({items.length} items)</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Platform fees</span><span>${fees.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Shipping {shippingCompany ? `(${shippingCompany})` : ""}</span><span>{shippingCompany ? `$${shippingCost.toFixed(2)}` : "Select carrier"}</span></div>
              <div className="text-[11px] text-slate-500 pl-1">Combined shipping — all cards ship in one package</div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-1.5"><span>Total</span><span className="text-emerald-400">${total.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <DialogFooter>
            <Button onClick={submit} disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Truck className="w-4 h-4 mr-1.5" />}
              Place Order · ${total.toFixed(2)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Label>
      {children}
    </div>
  );
}