import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Loader2 } from "lucide-react";
import ChatWindow from "@/components/chat/ChatWindow";

export default function Messages() {
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => setMe(null));
  }, []);

  const loadConversations = async () => {
    try {
      const list = await base44.entities.Conversation.list("-last_message_date", 50);
      setConversations(list);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();
    const unsub = base44.entities.Conversation.subscribe(() => loadConversations());
    return unsub;
  }, []);

  useEffect(() => {
    if (!me) return;
    const c = searchParams.get("c");
    const listingId = searchParams.get("listing");
    if (c) {
      setActiveId(c);
    } else if (listingId) {
      startConversation(listingId);
    }
  }, [me, searchParams]);

  const startConversation = async (listingId) => {
    try {
      const listing = await base44.entities.MarketplaceListing.get(listingId);
      const sellerId = listing.created_by_id;
      const sellerName = listing.created_by || "Seller";
      const existing = await base44.entities.Conversation.filter({ buyer_id: me.id, seller_id: sellerId, listing_id: listingId });
      if (existing.length) {
        setActiveId(existing[0].id);
      } else {
        const conv = await base44.entities.Conversation.create({
          listing_id: listingId,
          listing_name: listing.name,
          listing_image: listing.image_small,
          listing_price: listing.asking_price,
          seller_id: sellerId,
          seller_name: sellerName,
          buyer_id: me.id,
          buyer_name: me.full_name || me.email,
        });
        setActiveId(conv.id);
        loadConversations();
      }
      setSearchParams({});
    } catch {
      setSearchParams({});
    }
  };

  const active = conversations.find((c) => c.id === activeId);

  if (!me) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

  return (
    <div className="space-y-4 pk-fade-up">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Messages</div>
        <h1 className="font-bold text-2xl md:text-3xl">Chat with sellers & buyers</h1>
        <p className="text-sm text-slate-400">Discuss listings, share photos, and verify cards to trade safely.</p>
      </header>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        <div className={`rounded-2xl border border-white/5 bg-[#12151b] overflow-hidden ${active ? "hidden md:block" : ""}`}>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No conversations yet. Message a seller from any listing!</div>
          ) : (
            <div className="overflow-y-auto scrollbar-thin h-full">
              {conversations.map((c) => {
                const other = me.id === c.seller_id ? c.buyer_name : c.seller_name;
                const unread = me.id === c.buyer_id ? c.buyer_unread : c.seller_unread;
                return (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full flex items-center gap-3 p-3 text-left border-b border-white/5 transition ${c.id === activeId ? "bg-white/5" : "hover:bg-white/[0.03]"}`}>
                    {c.listing_image && <img src={c.listing_image} alt="" className="w-10 h-14 rounded object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{other || "Unknown"}</div>
                      <div className="text-xs text-slate-500 truncate">{c.listing_name}</div>
                      <div className="text-xs text-slate-600 truncate mt-0.5">{c.last_message || "No messages yet"}</div>
                    </div>
                    {unread > 0 && <span className="bg-emerald-500 text-[#0e1014] text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center shrink-0">{unread}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`rounded-2xl border border-white/5 bg-[#12151b] overflow-hidden ${!active ? "hidden md:flex" : "flex"}`}>
          {active ? (
            <ChatWindow conversation={active} me={me} onBack={() => setActiveId(null)} />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-slate-500">Select a conversation to start chatting</div>
          )}
        </div>
      </div>
    </div>
  );
}