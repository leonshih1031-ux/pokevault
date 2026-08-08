import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ScanLine } from "lucide-react";
import { searchCards } from "@/lib/pokemonApi";
import CardDetailModal from "@/components/pokemon/CardDetailModal";
import { useToast } from "@/components/ui/use-toast";

export default function Scan() {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [matched, setMatched] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const onFile = async (file) => {
    if (!file) return;
    setScanning(true); setMatched(null); setIdentity(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("identifyCard", { file_url });
      const id = res.data?.identity;
      setIdentity(id);
      if (!id || !id.name) { toast({ title: "Could not identify that card", variant: "destructive" }); return; }
      const { cards } = await searchCards({ query: id.name, pageSize: 30 });
      const best =
        cards.find((c) => id.set_name && c.set?.name?.toLowerCase() === id.set_name.toLowerCase()) ||
        cards.find((c) => id.number && c.number === id.number) ||
        cards[0];
      if (best) { setMatched(best); setModalOpen(true); }
      else toast({ title: "Identified, but not found in database", description: `${id.name} (${id.set_name || "?"})` });
    } catch {
      toast({ title: "Scan failed", variant: "destructive" });
    } finally { setScanning(false); }
  };

  return (
    <div className="space-y-8 pk-fade-up">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Photo Scan</div>
        <h1 className="font-bold text-2xl md:text-3xl">Snap a card to identify it</h1>
        <p className="text-sm text-slate-400">Upload or photograph a Pokémon card. AI reads the name, set, and number, then finds the exact card so you can check live TCGplayer prices and add it to your binder.</p>
      </header>

      <section className="rounded-2xl border border-white/5 bg-gradient-to-br from-[#181b22] to-[#12151b] p-6 md:p-8 text-center">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <img src={preview} alt="scan preview" className="max-h-64 rounded-xl border border-white/10 object-contain" />
            {scanning ? (
              <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Identifying card…</div>
            ) : (
              <Button onClick={() => fileRef.current?.click()} variant="outline"><Camera className="w-4 h-4 mr-2" /> Scan another</Button>
            )}
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/10 rounded-2xl py-12 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 grid place-items-center"><Camera className="w-7 h-7 text-emerald-400" /></div>
            <div className="font-medium">Upload or take a photo</div>
            <div className="text-xs text-slate-500">JPG / PNG · fill the frame with the card</div>
          </button>
        )}
      </section>

      {identity && (
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">AI identification</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-[10px] text-slate-500">Name</div><div className="font-medium truncate">{identity.name || "—"}</div></div>
            <div><div className="text-[10px] text-slate-500">Set</div><div className="font-medium truncate">{identity.set_name || "—"}</div></div>
            <div><div className="text-[10px] text-slate-500">Number</div><div className="font-medium">{identity.number || "—"}</div></div>
            <div><div className="text-[10px] text-slate-500">Confidence</div><div className="font-medium">{identity.confidence != null ? `${Math.round(identity.confidence * 100)}%` : "—"}</div></div>
          </div>
        </section>
      )}

      {matched && <CardDetailModal card={matched} open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  );
}