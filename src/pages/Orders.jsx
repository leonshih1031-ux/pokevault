import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, Truck, MapPin, Send, ShoppingBag, Store, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, SHIPMENT_STATUSES, SHIPPING_COMPANIES } from "@/lib/shipping";
import ShipmentTracker from "@/components/marketplace/ShipmentTracker";
import ShipmentProgress from "@/components/marketplace/ShipmentProgress";

export default function Orders() {
  const { toast } = useToast();
  const [tab, setTab] = useState("purchases");
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailUpdates, setDetailUpdates] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const m = await base44.auth.me();
      setMe(m);
      const allOrders = await base44.entities.Order.list("-created_date", 200);

      if (tab === "purchases") {
        setOrders(allOrders.filter((o) => o.created_by_id === m.id));
      } else {
        // Seller view: find orders where this seller has items
        const allItems = await base44.entities.OrderItem.list("-created_date", 500);
        const myOrderIds = new Set(allItems.filter((i) => i.seller_id === m.id).map((i) => i.order_id));
        setOrders(allOrders.filter((o) => myOrderIds.has(o.id)));
        setOrderItems(allItems.filter((i) => i.seller_id === m.id));
      }
    } catch {
      toast({ title: "Could not load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast({ title: "Payment successful!", description: "Your order has been placed. The seller will prepare your shipment." });
    }
  }, []);

  const openOrder = async (order) => {
    setLoadingDetail(true);
    try {
      const [freshOrder, items, updates] = await Promise.all([
        base44.entities.Order.get(order.id),
        base44.entities.OrderItem.filter({ order_id: order.id }),
        base44.entities.ShipmentUpdate.filter({ order_id: order.id }),
      ]);
      setSelectedOrder(freshOrder);
      setDetailItems(items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setDetailUpdates(updates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch {
      setSelectedOrder(order);
      toast({ title: "Could not load order details", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return <div className="h-48 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="space-y-6 pk-fade-up">
      <header>
        <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Orders</div>
        <h1 className="font-bold text-2xl md:text-3xl">My Orders</h1>
        <p className="text-sm text-slate-400">Track purchases and manage shipments for your sales.</p>
      </header>

      <div className="flex gap-2 border-b border-white/5">
        <TabButton active={tab === "purchases"} onClick={() => setTab("purchases")} icon={ShoppingBag} label="My Purchases" />
        <TabButton active={tab === "sales"} onClick={() => setTab("sales")} icon={Store} label="My Sales" />
      </div>

      {orders.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center rounded-xl border border-dashed border-white/5">
          {tab === "purchases" ? "No purchases yet. Browse the marketplace to buy cards." : "No sales yet. Create listings to start selling."}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} items={tab === "sales" ? orderItems.filter((i) => i.order_id === o.id) : []} onClick={() => openOrder(o)} />
          ))}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          items={detailItems}
          updates={detailUpdates}
          loading={loadingDetail}
          isSeller={tab === "sales" || (me && detailItems.some((i) => i.seller_id === me.id))}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => openOrder(selectedOrder)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${active ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-400 hover:text-white"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function OrderCard({ order, items, onClick }) {
  const color = ORDER_STATUS_COLORS[order.status] || "#94a3b8";
  const thumbnails = items.slice(0, 5);
  return (
    <button onClick={onClick} className="w-full text-left rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] transition-all p-4 flex items-center gap-4">
      <div className="flex -space-x-2">
        {thumbnails.length > 0 ? thumbnails.map((it, i) => (
          <img key={i} src={it.card_image} alt="" className="w-10 h-14 object-cover rounded border border-white/10 relative z-10" style={{ zIndex: 5 - i }} />
        )) : <div className="w-10 h-14 rounded bg-white/5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{order.items_count} item{order.items_count !== 1 ? "s" : ""}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {new Date(order.created_date).toLocaleDateString()} · {order.shipping_company} · {order.shipping_country}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-emerald-400">${(order.total_amount || 0).toFixed(2)}</div>
        <ChevronRight className="w-4 h-4 text-slate-600 ml-auto mt-1" />
      </div>
    </button>
  );
}

function OrderDetailModal({ order, items, updates, loading, isSeller, onClose, onUpdated }) {
  const { toast } = useToast();
  const [shipForm, setShipForm] = useState({ status: "preparing", location: "", note: "", tracking_number: "", shipping_company: order.shipping_company || "" });
  const [busy, setBusy] = useState(false);
  const color = ORDER_STATUS_COLORS[order.status] || "#94a3b8";

  const submitUpdate = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("updateShipment", { order_id: order.id, ...shipForm });
      toast({ title: "Shipment updated", description: "The buyer has been notified of the progress." });
      onUpdated?.();
      setShipForm((f) => ({ ...f, location: "", note: "" }));
    } catch (err) {
      toast({ title: err.message || "Could not update shipment", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-[#181b22] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg font-display">Order Details</h2>
              <div className="text-xs text-slate-500">{new Date(order.created_date).toLocaleString()}</div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${color}22`, color }}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
          </div>

          {loading ? (
            <div className="h-32 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
          ) : (
            <>
              {/* Items */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Items ({items.length})</div>
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
                    <img src={it.card_image} alt={it.card_name} className="w-10 h-14 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">{it.card_name}</div>
                      <div className="text-[11px] text-slate-500">{it.set_name} · #{it.number} · {it.condition}</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-400">${(it.asking_price || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">Order Summary</div>
                <div className="rounded-lg bg-white/5 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Items ({order.items_count})</span><span>${((order.total_amount || 0) - (order.shipping_cost || 0) - (order.platform_fee_total || 0)).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Platform fees</span><span>${(order.platform_fee_total || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Shipping</span><span>${(order.shipping_cost || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t border-white/10 pt-1.5"><span>Total</span><span className="text-emerald-400">${(order.total_amount || 0).toFixed(2)}</span></div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-400" /> Shipping Address</div>
                <div className="rounded-lg bg-white/5 p-3 text-sm space-y-0.5">
                  <div className="font-medium">{order.buyer_name || "—"}</div>
                  <div className="text-slate-400">{order.shipping_address}</div>
                  <div className="text-slate-400">{[order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(", ")}</div>
                  <div className="text-slate-400">{order.shipping_country}</div>
                  {order.shipping_phone && <div className="text-slate-400">Phone: {order.shipping_phone}</div>}
                  <div className="text-slate-400 pt-1 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {order.shipping_company}</div>
                  {order.tracking_number && <div className="text-emerald-300 pt-1">Tracking: <span className="font-mono">{order.tracking_number}</span></div>}
                </div>
              </div>

              {/* Shipment progress stepper */}
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-1.5"><Package className="w-4 h-4 text-emerald-400" /> Delivery Progress</div>
                <ShipmentProgress updates={updates} orderStatus={order.status} />
              </div>

              {/* Shipment tracking timeline */}
              <div className="space-y-2">
                <div className="text-sm font-semibold flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-400" /> Tracking History</div>
                <ShipmentTracker updates={updates} orderStatus={order.status} />
              </div>

              {/* Seller: update shipment form */}
              {isSeller && order.status !== "pending_payment" && order.status !== "cancelled" && (
                <div className="space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <div className="text-sm font-semibold text-emerald-300">Update Shipment Status</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-slate-400">Status</Label>
                      <select value={shipForm.status} onChange={(e) => setShipForm((f) => ({ ...f, status: e.target.value }))} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm w-full">
                        {SHIPMENT_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] || s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-slate-400">Shipping Company</Label>
                      <select value={shipForm.shipping_company} onChange={(e) => setShipForm((f) => ({ ...f, shipping_company: e.target.value }))} className="bg-white/5 border border-white/10 rounded-md h-9 px-3 text-sm w-full">
                        <option value="">Select…</option>
                        {SHIPPING_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-slate-400">Tracking Number</Label>
                      <Input value={shipForm.tracking_number} onChange={(e) => setShipForm((f) => ({ ...f, tracking_number: e.target.value }))} placeholder="e.g. 1Z999AA10123456784" className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-slate-400">Current Location</Label>
                      <Input value={shipForm.location} onChange={(e) => setShipForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Hong Kong Sort Facility" className="bg-white/5 border-white/10" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-[11px] uppercase tracking-wide text-slate-400">Note</Label>
                      <Input value={shipForm.note} onChange={(e) => setShipForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Package handed to carrier" className="bg-white/5 border-white/10" />
                    </div>
                  </div>
                  <Button onClick={submitUpdate} disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                    Post Update
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}