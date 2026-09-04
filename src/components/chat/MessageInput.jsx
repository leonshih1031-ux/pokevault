import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Send, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const onFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImage(file_url);
    } catch {
      setUploading(false);
    }
    setUploading(false);
  };

  const send = async () => {
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      await onSend(text.trim(), image || null);
      setText("");
      setImage(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-white/10 p-3 bg-[#12151b]">
      {image && (
        <div className="mb-2 relative inline-block">
          <img src={image} alt="preview" className="h-20 rounded-lg border border-white/10" />
          <button onClick={() => setImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading || disabled} className="text-slate-400 hover:text-white shrink-0">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </Button>
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" disabled={disabled} className="bg-white/5 border-white/10" />
        <Button onClick={send} disabled={(!text.trim() && !image) || sending || disabled} size="icon" className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014] shrink-0">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}