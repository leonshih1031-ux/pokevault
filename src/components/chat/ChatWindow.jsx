import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import MessageInput from "./MessageInput";
import VerifyScanDialog from "./VerifyScanDialog";

export default function ChatWindow({ conversation, me, onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [listing, setListing] = useState(null);
  const endRef = useRef(null);
  const other = me.id === conversation.seller_id
    ? { name: conversation.buyer_name, id: conversation.buyer_id }
    : { name: conversation.seller_name, id: conversation.seller_id };

  const loadMessages = async () => {
    const list = await base44.entities.Message.filter({ conversation_id: conversation.id }, "created_date", 200);
    setMessages(list);
    setLoading(false);
    const unread = list.filter((m) => m.recipient_id === me.id && !m.read);
    if (unread.length) {
      await base44.entities.Message.bulkUpdate(unread.map((m) => ({ id: m.id, read: true })));
      const isBuyer = me.id === conversation.buyer_id;
      await base44.entities.Conversation.update(conversation.id, isBuyer ? { buyer_unread: 0 } : { seller_unread: 0 });
    }
  };

  useEffect(() => {
    setLoading(true);
    loadMessages();
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === conversation.id) loadMessages();
    });
    return unsub;
  }, [conversation.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text, image_url) => {
    await base44.entities.Message.create({
      conversation_id: conversation.id,
      sender_id: me.id,
      sender_name: me.full_name || me.email,
      recipient_id: other.id,
      text, image_url,
      listing_id: conversation.listing_id,
      read: false,
    });
    const isBuyer = me.id === conversation.buyer_id;
    await base44.entities.Conversation.update(conversation.id, {
      last_message: image_url && !text ? "📷 Photo" : text,
      last_message_date: new Date().toISOString(),
      last_sender_id: me.id,
      [isBuyer ? "seller_unread" : "buyer_unread"]: (conversation[isBuyer ? "seller_unread" : "buyer_unread"] || 0) + 1,
    });
  };

  const openVerify = async () => {
    try {
      const l = await base44.entities.MarketplaceListing.get(conversation.listing_id);
      setListing(l);
    } catch { setListing(null); }
    setVerifyOpen(true);
  };

  const shareVerification = async (summary) => {
    await send(summary, null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-white/10 bg-[#12151b]">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden text-slate-300 hover:text-slate-300 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {conversation.listing_image && <img src={conversation.listing_image} alt="" className="w-10 h-14 rounded object-cover shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{other.name || "Unknown"}</div>
          <div className="text-xs text-slate-500 truncate">{conversation.listing_name} · ${(conversation.listing_price || 0).toFixed(2)}</div>
        </div>
        <Button variant="outline" size="sm" onClick={openVerify} className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-300 shrink-0">
          <ShieldCheck className="w-4 h-4 mr-1.5" /> Verify
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {loading ? (
          <div className="text-center text-sm text-slate-500 py-8">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">No messages yet. Say hello!</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-emerald-500 text-[#0e1014]" : "bg-white/5 text-slate-100"}`}>
                  {m.image_url && (
                    <div className="rounded-lg overflow-hidden mb-1 w-40 h-40">
                      <Image src={m.image_url} alt="attachment" fittingType="fit" className="w-full h-full" />
                    </div>
                  )}
                  {m.text && <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>}
                  <div className={`text-[10px] mt-0.5 ${mine ? "text-[#0e1014]/60" : "text-slate-500"}`}>
                    {new Date(m.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <MessageInput onSend={send} />
      <VerifyScanDialog open={verifyOpen} onOpenChange={setVerifyOpen} listing={listing} onShareResult={shareVerification} />
    </div>
  );
}