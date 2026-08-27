import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { searchCards, getCardPrice, CONDITIONS, VARIANTS, GRADE_COMPANIES } from "@/lib/pokemonApi";
import { useToast } from "@/components/ui/use-toast";

const EMPTY = { condition: "Near Mint", variant: "Normal", language: "English", grading_company: "Raw", grade: "", asking_price: "", description: "", location: "", shipping: "" };

export default function CreateListingModal({ open, onOpenChange, listing, onSaved }) {
  const editing = !!listing;
  const [step, setStep] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [card, setCard] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (listing) {
      setCard({ id: listing.card_id, name: listing.name, set: { id: listing.set_id, name: listing.set_name }, number: listing.number, images: { small: listing.image_small, large: listing.image_large }, rarity: listing.rarity });
      setStep("details");
      setForm({ condition: listing.condition || "Near Mint", variant: listing.variant || "Normal", language: listing.language || "English", grading_company: listing.grading_company || "Raw", grade: listing.grade || "", asking_price: String(listing.asking_price ?? ""), description: listing.description || "", location: listing.location || "", shipping: listing.shipping || "" });
    } else {
      setStep("search"); setQuery(""); setResults([]); setCard(null); setForm(EMPTY);
    }
  }, [open, listing]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await searchCards({ query, pageSize: 24 });
      setResults(r.cards);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const pickCard = (c) => {
    setCard(c);
    setForm((f) => ({ ...f, asking_price: f.asking_price || String((getCardPrice(c) || 0).toFixed(2)) }));
    setStep("details");
  };

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!card) return;
    if (!form.asking_price || Number(form.asking_price) <= 0) {
      toast({ title: "Enter an asking price", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      card_id: card.id, name: card.name, set_id: card.set?.id, set_name: card.set?.name, number: card.number,
      image_small: card.images?.small, image_large: card.images?.large, rarity: card.rarity,
      condition: form.condition, variant: form.variant, language: form.language, grading_company: form.grading_company,
      grade: form.grade, asking_price: Number(form.asking_price), platform_fee: 6, description: form.description,
      location: form.location, shipping: form.shipping, status: "active",
    };
    try {
      if (editing) await base44.entities.MarketplaceListing.update(listing.id, payload);
      else await base44.entities.MarketplaceListing.create(payload);
      toast({ title: editing ? "Listing updated" : "Listing created" });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not save listing", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-2xl">
        <DialogHeader><DialogTitle className="font-display">{editing ? "Edit listing" : "Create a listing"}</DialogTitle></DialogHeader>
        {step === "search" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Search for a card to list…" className="bg-white/5 border-white/10 pl-9" /></div>
              <Button onClick={doSearch} disabled={searching} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">{searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}</Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto scrollbar-thin">
              {results.map((c) => (
                <button key={c.id} onClick={() => pickCard(c)} className="rounded-lg border border-white/5 bg-white/[0.02] hover:border-emerald-400/50 overflow-hidden text-left">
                  <img src={c.images?.small} alt={c.name} className="w-full aspect-[3/4] object-cover" />
                  <div className="p-1.5 text-[10px] font-medium leading-tight line-clamp-1">{c.name}</div>
                </button>
              ))}
              {results.length === 0 && !searching && <div className="col-span-full text-center text-sm text-slate-500 py-8">Search to find a card.</div>}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-[160px_1fr] gap-5">
            <div>
              <div className="rounded-lg overflow-hidden border border-white/10"><img src={card?.images?.large || card?.images?.small} alt={card?.name} className="w-full" /></div>
              <div className="mt-2 text-xs text-slate-500">{card?.set?.name} · #{card?.number}</div>
            </div>
            <div className="space-y-3">
              <Field label="Asking Price ($)"><Input type="number" step="0.01" value={form.asking_price} onChange={upd("asking_price")} className="bg-white/5 border-white/10" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Condition"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.condition} onChange={upd("condition")}>{CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
                <Field label="Variant"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.variant} onChange={upd("variant")}>{VARIANTS.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
                <Field label="Grading"><select className="bg-white/5 border border-white/10 rounded-md h-10 px-2 text-sm w-full" value={form.grading_company} onChange={upd("grading_company")}>{GRADE_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
                <Field label="Grade"><Input value={form.grade} onChange={upd("grade")} placeholder="e.g. 9" className="bg-white/5 border-white/10" /></Field>
                <Field label="Location"><Input value={form.location} onChange={upd("location")} placeholder="e.g. Hong Kong" className="bg-white/5 border-white/10" /></Field>
                <Field label="Shipping"><Input value={form.shipping} onChange={upd("shipping")} placeholder="e.g. $3 worldwide" className="bg-white/5 border-white/10" /></Field>
              </div>
              <Field label="Description"><textarea value={form.description} onChange={upd("description")} rows={2} placeholder="Condition notes, bundle deals, etc." className="bg-white/5 border border-white/10 rounded-md w-full px-3 py-2 text-sm" /></Field>
              {!editing && <Button variant="ghost" size="sm" onClick={() => setStep("search")} className="text-slate-400">← Change card</Button>}
            </div>
          </div>
        )}
        {step === "details" && (
          <DialogFooter>
            <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save changes" : "Publish listing"}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">{label}</Label>{children}</div>;
}