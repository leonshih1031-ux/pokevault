import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, ScanLine, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function VerifyScanDialog({ open, onOpenChange, listing, onShareResult }) {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const { toast } = useToast();

  const reset = () => { setPreview(null); setResult(null); };

  const onFile = async (file) => {
    if (!file) return;
    reset();
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("verifyCardScan", {
        file_url,
        listing_name: listing?.name,
        listing_set: listing?.set_name,
        listing_number: listing?.number,
        listing_rarity: listing?.rarity,
        listing_condition: listing?.condition,
      });
      setResult(res.data?.verification);
    } catch {
      toast({ title: "Verification failed", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const shareResult = () => {
    if (!result) return;
    let summary;
    if (result.scam_flag) {
      summary = `🚨 SCAM FLAG: Internet image detected${result.internet_source_site ? ` (source: ${result.internet_source_site})` : ""}. The proof photo appears to be a stock image from the web, not a real photo of the physical card. ${result.scam_detail || ""}`;
    } else if (result.overall_match) {
      summary = `✅ Card verified — matches listing (${Math.round((result.confidence || 0) * 100)}% confidence)${result.notes ? `\n${result.notes}` : ""}`;
    } else {
      summary = `⚠️ Verification alert: ${result.notes || "Possible mismatch with listing"}`;
    }
    onShareResult?.(summary);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-lg">
        <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><ScanLine className="w-5 h-5 text-emerald-400" /> Verify card authenticity</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-400">Snap a photo of the card you received. AI compares it to the listing to check for scams.</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {!preview ? (
          <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/10 rounded-xl py-10 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition flex flex-col items-center gap-2">
            <Camera className="w-8 h-8 text-emerald-400" />
            <span className="text-sm font-medium">Upload or take a photo</span>
          </button>
        ) : (
          <div className="space-y-3">
            <img src={preview} alt="scan" className="max-h-48 mx-auto rounded-lg border border-white/10 object-contain" />
            {scanning ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</div>
            ) : result ? (
              <div className="space-y-2">
                {result.scam_flag ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg p-3 bg-red-500/15 text-red-300 border border-red-500/30">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="font-medium">🚨 Scam flag — internet image detected</div>
                        <div className="text-xs opacity-80">The uploaded photo matches an online source, not a real card.</div>
                      </div>
                    </div>
                    {result.internet_source_site && (
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500">Matched on:</span>{" "}
                        <span className="text-red-300 font-medium">{result.internet_source_site}</span>
                        {result.internet_source_url && (
                          <a href={result.internet_source_url} target="_blank" rel="noreferrer" className="ml-2 text-emerald-400 underline break-all">{result.internet_source_url}</a>
                        )}
                      </div>
                    )}
                    {result.scam_detail && <div className="text-xs text-slate-400">{result.scam_detail}</div>}
                    <div className="text-xs text-amber-300/80 bg-amber-500/5 rounded p-2 border border-amber-500/10">
                      A legitimate proof photo should show a real physical card in the seller's hand — glare, background, perspective — not a clean digital scan.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`flex items-center gap-2 rounded-lg p-3 ${result.overall_match ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                      {result.overall_match ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                      <div>
                        <div className="font-medium">{result.overall_match ? "Card matches listing" : "Possible mismatch"}</div>
                        <div className="text-xs opacity-80">{Math.round((result.confidence || 0) * 100)}% confidence</div>
                      </div>
                    </div>
                    {result.internet_image_detected === false && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Internet image check passed — photo appears genuine
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Match label="Name" ok={result.name_match} />
                      <Match label="Set" ok={result.set_match} />
                      <Match label="Number" ok={result.number_match} />
                    </div>
                    {result.condition_assessment && <div className="text-xs text-slate-400"><span className="text-slate-500">Condition:</span> {result.condition_assessment}</div>}
                    {result.notes && <div className="text-xs text-slate-400">{result.notes}</div>}
                  </>
                )}
              </div>
            ) : null}
            {!scanning && <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full border-white/10 text-slate-300 hover:text-slate-300">Scan another</Button>}
          </div>
        )}
        {result && onShareResult && (
          <DialogFooter>
            <Button onClick={shareResult} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">Share result in chat</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Match({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/5">
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
      <span>{label}</span>
    </div>
  );
}