import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRarityStyle, CONDITIONS, VARIANTS, GRADE_COMPANIES } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

export default function EditCollectionModal({ entry, open, onOpenChange }) {
  const [form, setForm] = useState(entry);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setForm(entry); }, [entry]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.CollectionCard.update(entry.id, {
        quantity: Number(form.quantity) || 1,
        condition: form.condition,
        variant: form.variant,
        language: form.language,
        grading_company: form.grading_company,
        grade: form.grade,
        purchase_price: Number(form.purchase_price) || 0,
        current_price: Number(form.current_price) || 0,
        date_acquired: form.date_acquired,
        folder: form.folder,
        notes: form.notes,
      });
      toast({ title: "Updated" });
      onOpenChange(false);
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await base44.entities.CollectionCard.delete(entry.id);
      toast({ title: "Removed from binder" });
      onOpenChange(false);
    } catch { toast({ title: "Delete failed", variant: "destructive" }); setSaving(false); }
  };

  if (!entry) return null;
  const style = getRarityStyle(entry.rarity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-2xl">
        <DialogHeader><DialogTitle className="font-display">{entry.name}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-[200px_1fr] gap-5">
          <div>
            <div className="rounded-xl overflow-hidden border border-white/10" style={{ boxShadow: `0 0 30px ${style.glow}` }}>
              <img src={entry.image_large || entry.image_small} alt={entry.name} className="w-full" />
            </div>
            <div className="mt-2 text-xs text-slate-500">{entry.set_name} · #{entry.number}</div>
            <div className="text-xs font-medium" style={{ color: style.color }}>{entry.rarity}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><Input type="number" min="1" value={form.quantity || 1} onChange={(e) => set("quantity", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Condition"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.condition} onChange={(e) => set("condition", e.target.value)}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Variant"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.variant} onChange={(e) => set("variant", e.target.value)}>{VARIANTS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Language"><Input value={form.language || "English"} onChange={(e) => set("language", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Grading"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.grading_company} onChange={(e) => set("grading_company", e.target.value)}>{GRADE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Grade"><Input placeholder="e.g. PSA 10" value={form.grade || ""} onChange={(e) => set("grade", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Purchase Price ($)"><Input type="number" step="0.01" value={form.purchase_price || 0} onChange={(e) => set("purchase_price", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Current Value ($)"><Input type="number" step="0.01" value={form.current_price || 0} onChange={(e) => set("current_price", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Date Acquired"><Input type="date" value={(form.date_acquired || "").slice(0, 10)} onChange={(e) => set("date_acquired", e.target.value)} className="bg-white/5 border-white/10" /></Field>
            <Field label="Folder"><Input value={form.folder || "Main"} onChange={(e) => set("folder", e.target.value)} className="bg-white/5 border-white/10" /></Field>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={remove} disabled={saving} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4 mr-1.5" /> Remove</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Label>{children}</div>;
}