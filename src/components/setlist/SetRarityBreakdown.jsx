import { getRarityStyle } from "@/lib/pokemonApi";

// Maps a TCG API rarity string to one of 7 standard rarity groups.
export function rarityGroup(rarity = "") {
  const r = (rarity || "").toLowerCase();
  if (r.includes("secret") || r.includes("rainbow")) return "Secret";
  if (r.includes("special illustration") || r.includes("special illus")) return "Special Illus.";
  if (r.includes("ultra") || r.includes("vmax") || r.includes("vstar") || r === "v" || r.endsWith(" ex") || r.endsWith(" gx") || r.includes("ace spec")) return "Ultra Rare";
  if (r.includes("illustration") || r.includes("special")) return "Illustration";
  if (r.includes("holo") || r.includes("reverse") || r.includes("shiny") || r.includes("shining") || r.includes("prism")) return "Holo";
  if (r.includes("rare")) return "Rare";
  if (r.includes("uncommon")) return "Uncommon";
  return "Common";
}

const GROUP_ORDER = ["Common", "Uncommon", "Rare", "Holo", "Illustration", "Ultra Rare", "Special Illus.", "Secret"];

// Builds rarity group stats from a full set's cards and a map of owned card IDs.
// Returns [{ group, total, owned, color }] in display order.
export function buildRarityStats(allCards, ownedMap) {
  const stats = {};
  for (const c of allCards) {
    const g = rarityGroup(c.rarity);
    if (!stats[g]) stats[g] = { group: g, total: 0, owned: 0 };
    stats[g].total++;
    if (ownedMap[c.id]) stats[g].owned++;
  }
  return GROUP_ORDER
    .map((g) => stats[g])
    .filter(Boolean);
}

export default function SetRarityBreakdown({ stats }) {
  const total = stats.reduce((s, g) => s + g.total, 0);
  const owned = stats.reduce((s, g) => s + g.owned, 0);

  return (
    <div className="space-y-2.5">
      {/* Stacked progress bar */}
      <div className="h-3 rounded-full overflow-hidden bg-white/5 flex">
        {stats.map((g) => {
          const style = getRarityStyle(g.group);
          const widthPct = total ? (g.total / total) * 100 : 0;
          const ownedPct = g.total ? (g.owned / g.total) * 100 : 0;
          if (widthPct === 0) return null;
          return (
            <div
              key={g.group}
              className="relative h-full transition-all"
              style={{ width: `${widthPct}%`, background: style.color, opacity: 0.25 }}
              title={`${g.group}: ${g.owned}/${g.total}`}
            >
              <div className="absolute inset-0" style={{ background: style.color, opacity: ownedPct / 100 * 0.75 }} />
            </div>
          );
        })}
      </div>

      {/* Legend with counts */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {stats.map((g) => {
          const style = getRarityStyle(g.group);
          return (
            <div key={g.group} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: style.color }} />
              <span className="text-slate-400">{g.group}</span>
              <span className="font-semibold" style={{ color: g.owned > 0 ? style.color : "#64748b" }}>
                {g.owned}/{g.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}