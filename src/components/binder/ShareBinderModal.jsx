import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Loader2, Globe, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

export default function ShareBinderModal({ open, onOpenChange }) {
  const { user, checkUserAuth } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setIsPublic(!!user?.public_profile);
      setDisplayName(user?.display_name || user?.full_name || "");
      setBio(user?.bio || "");
    }
  }, [user, open]);

  const shareUrl = user ? `${window.location.origin}/u/${user.id}` : "";

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ public_profile: isPublic, display_name: displayName, bio });
      await checkUserAuth();
      toast({ title: isPublic ? "Your binder is now public" : "Your binder is now private" });
    } catch { toast({ title: "Could not save", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-md">
        <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Share your binder</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex-1 pr-3">
              <div className="text-sm font-medium flex items-center gap-1.5">{isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />} {isPublic ? "Public" : "Private"}</div>
              <div className="text-xs text-slate-500 mt-0.5">{isPublic ? "Anyone with the link can view your binder." : "Only you can see your binder."}</div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-white/5 border-white/10" /></div>
          <div className="space-y-1.5"><Label className="text-[11px] uppercase tracking-wide text-slate-400">Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="bg-white/5 border-white/10 resize-none" /></div>
          {isPublic && shareUrl && (
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-slate-400">Shareable link</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="bg-white/5 border-white/10 text-xs" />
                <Button variant="secondary" className="bg-white/5" onClick={copy}>{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter><Button onClick={save} disabled={saving} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}