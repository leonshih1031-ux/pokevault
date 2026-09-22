import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CONDITIONS, VARIANTS } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

const NO_CHANGE = "__no_change__";

export default function BulkEditModal({ selectedIds, open, onOpenChange, onDone }) {
  const [condition, setCondition] = useState(NO_CHANGE);
  const [variant, setVariant] = useState(NO_CHANGE);
  const [qtyMode, setQtyMode] = useState(NO_CHANGE);
  const [qtyValue, setQtyValue] = useState(1);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const count = selectedIds.length;

  const save = async () => {
    setSaving(true);
    try {
      // Build update payload — only include fields the user chose to change.
      const updates = selectedIds.map((id) => {
        const patch = { id };
        if (condition !== NO_CHANGE) patch.condition = condition;
        if (variant !== NO_CHANGE) patch.variant = variant;
        if (qtyMode === "set") patch.quantity = Math.max(1, parseInt(qtyValue) || 1);
        return patch;
      });
      await base44.entities.CollectionCard.bulkUpdate(updates);

      const changed = [];
      if (condition !== NO_CHANGE) changed.push("condition");
      if (variant !== NO_CHANGE) changed.push("variant");
      if (qtyMode === "set") changed.push("quantity");
      toast({ title: `Updated ${count} card${count === 1 ? "" : "s"}`, description: changed.join(" · ") || "No fields changed" });
      onOpenChange(false);
      onDone?.();
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Bulk Edit {count} card{count === 1 ? "" : "s"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-400 -mt-2">Only fields you change will be applied to all selected cards.</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-slate-400">Condition</Label>
            <select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value={NO_CHANGE}>No change</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-slate-400">Variant</Label>
            <select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value={NO_CHANGE}>No change</option>
              {VARIANTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-slate-400">Quantity</Label>
            <div className="flex gap-2">
              <select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-36" value={qtyMode} onChange={(e) => setQtyMode(e.target.value)}>
                <option value={NO_CHANGE}>No change</option>
                <option value="set">Set to</option>
              </select>
              {qtyMode === "set" && (
                <Input type="number" min="1" value={qtyValue} onChange={(e) => setQtyValue(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving || count === 0} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
            Apply to {count} card{count === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}