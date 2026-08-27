import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/shipping";
import { Package, Truck, MapPin, CheckCircle } from "lucide-react";

const STATUS_ICONS = {
  preparing: Package,
  shipped: Truck,
  in_transit: Truck,
  delivered: CheckCircle,
};

export default function ShipmentTracker({ updates = [], orderStatus }) {
  if (!updates || updates.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center rounded-lg bg-white/5">
        No shipment updates yet. The seller will update tracking once your order is prepared.
      </div>
    );
  }

  const sorted = [...updates].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="space-y-0">
      {sorted.map((u, i) => {
        const Icon = STATUS_ICONS[u.status] || MapPin;
        const color = ORDER_STATUS_COLORS[u.status] || "#94a3b8";
        return (
          <div key={u.id || i} className="flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}22`, border: `1.5px solid ${color}` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              {i < sorted.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{ color }}>{ORDER_STATUS_LABELS[u.status] || u.status}</span>
                <span className="text-[11px] text-slate-500">{new Date(u.created_date).toLocaleString()}</span>
              </div>
              {u.location && <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {u.location}</div>}
              {u.note && <div className="text-xs text-slate-300 mt-1">{u.note}</div>}
              {u.tracking_number && <div className="text-xs text-slate-400 mt-1">Tracking: <span className="font-mono text-emerald-300">{u.tracking_number}</span></div>}
              {u.shipping_company && <div className="text-xs text-slate-400">Via {u.shipping_company}</div>}
              <div className="text-[10px] text-slate-600 mt-0.5">by {u.seller_name || "Seller"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}