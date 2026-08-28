import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/shipping";
import { Package, Truck, Navigation, CheckCircle } from "lucide-react";

// The four shipment stages in delivery order.
const STAGES = [
  { key: "preparing", icon: Package, label: "Preparing" },
  { key: "shipped", icon: Truck, label: "Shipped" },
  { key: "in_transit", icon: Navigation, label: "In Transit" },
  { key: "delivered", icon: CheckCircle, label: "Delivered" },
];

// Find the timestamp of the first update matching a given status.
const stageTime = (updates, status) => {
  const match = updates
    .filter((u) => u.status === status)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
  return match ? new Date(match.created_date) : null;
};

export default function ShipmentProgress({ updates = [], orderStatus }) {
  // Determine the current stage index from the order status.
  // "paid" maps to the Preparing stage (seller hasn't posted updates yet).
  // pending_payment / cancelled have not started shipping.
  const statusKey = orderStatus === "paid" ? "preparing" : orderStatus;
  const activeIndex = STAGES.findIndex((s) => s.key === statusKey);
  const started = activeIndex >= 0 && orderStatus !== "cancelled";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <div className="flex items-start justify-between gap-1">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const time = stageTime(updates, stage.key);
          const isDone = started && i < activeIndex;
          const isCurrent = started && i === activeIndex;
          const isPending = !started || i > activeIndex;
          const color = ORDER_STATUS_COLORS[stage.key] || "#94a3b8";

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center text-center min-w-0">
              <div className="relative w-full flex items-center">
                {/* connector line before (left) */}
                {i > 0 && (
                  <div
                    className="absolute right-1/2 top-4 h-0.5 w-1/2"
                    style={{ background: isDone ? color : "rgba(255,255,255,0.08)" }}
                  />
                )}
                {/* connector line after (right) */}
                {i < STAGES.length - 1 && (
                  <div
                    className="absolute left-1/2 top-4 h-0.5 w-1/2"
                    style={{ background: isDone ? color : "rgba(255,255,255,0.08)" }}
                  />
                )}
                <div
                  className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 mx-auto transition-all"
                  style={{
                    background: isDone || isCurrent ? `${color}22` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${isDone || isCurrent ? color : "rgba(255,255,255,0.12)"}`,
                    boxShadow: isCurrent ? `0 0 0 4px ${color}1a` : "none",
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isDone || isCurrent ? color : "#64748b" }}
                  />
                </div>
              </div>
              <div className="mt-2 w-full">
                <div
                  className="text-[11px] font-semibold leading-tight"
                  style={{ color: isDone || isCurrent ? color : isPending ? "#64748b" : "#94a3b8" }}
                >
                  {stage.label}
                </div>
                {time ? (
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    <br />
                    {time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    {isCurrent ? "In progress" : "—"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!started && (
        <div className="text-center text-xs text-slate-500 mt-3 pt-3 border-t border-white/5">
          {orderStatus === "cancelled"
            ? "This order was cancelled."
            : orderStatus === "pending_payment"
            ? "Awaiting payment before shipment begins."
            : "Payment received — seller will prepare your shipment soon."}
        </div>
      )}
    </div>
  );
}