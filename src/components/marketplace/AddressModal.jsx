import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { COUNTRIES } from "@/lib/shipping";
import { useToast } from "@/components/ui/use-toast";

export default function AddressModal({ open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ country: "", address_line: "", city: "", state_region: "", postal_code: "", phone: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then((m) => {
      setForm({
        country: m.country || "",
        address_line: m.address_line || "",
        city: m.city || "",
        state_region: m.state_region || "",
        postal_code: m.postal_code || "",
        phone: m.phone || "",
      });
    }).catch(() => {});
  }, [open]);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.country || !form.address_line) {
      toast({ title: "Country and address are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await base44.auth.updateMe(form);
      toast({ title: "Address saved" });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not save address", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-400" /> My Shipping Address</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-slate-400">Country</Label>
            <select value={form.country} onChange={upd("country")} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm w-full">
              <option value="">Select country…</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-slate-400">Street Address</Label>
            <Input value={form.address_line} onChange={upd("address_line")} placeholder="123 Main St, Apt 4B" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">City</Label><Input value={form.city} onChange={upd("city")} className="bg-white/5 border-white/10" /></div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">State / Region</Label><Input value={form.state_region} onChange={upd("state_region")} className="bg-white/5 border-white/10" /></div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">Postal Code</Label><Input value={form.postal_code} onChange={upd("postal_code")} className="bg-white/5 border-white/10" /></div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">Phone</Label><Input value={form.phone} onChange={upd("phone")} className="bg-white/5 border-white/10" /></div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            Save Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}