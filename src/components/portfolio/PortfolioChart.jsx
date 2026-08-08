import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function PortfolioChart({ snapshots }) {
  const data = (snapshots || [])
    .slice()
    .sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date))
    .map((s) => ({
      date: new Date(s.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: Number(s.total_value || 0),
    }));

  if (data.length < 2) {
    return (
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <div className="font-semibold mb-1">Portfolio Performance</div>
        <div className="text-sm text-slate-500 py-10 text-center">
          Your portfolio value history will appear here. We snapshot your total value each day you visit — check back tomorrow.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold">Portfolio Performance</div>
        <div className="text-xs text-slate-500">{data.length} day{data.length === 1 ? "" : "s"}</div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pvfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip
              contentStyle={{ background: "#12151b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, "Value"]}
            />
            <Area type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} fill="url(#pvfill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}