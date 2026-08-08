import { Outlet, NavLink } from "react-router-dom";
import { Home, Sparkles, BookOpen, Search, Heart, Store, ListChecks, Bell, Camera, Newspaper } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/packs", label: "Pack Opening", icon: Sparkles, end: false },
  { to: "/binder", label: "Binder", icon: BookOpen, end: false },
  { to: "/search", label: "Search", icon: Search, end: false },
  { to: "/wishlist", label: "Wishlist", icon: Heart, end: false },
  { to: "/marketplace", label: "Marketplace", icon: Store, end: false },
  { to: "/setlist", label: "Set List", icon: ListChecks, end: false },
  { to: "/alerts", label: "Alerts", icon: Bell, end: false },
  { to: "/scan", label: "Scan", icon: Camera, end: false },
  { to: "/news", label: "News", icon: Newspaper, end: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#0e1014] text-slate-100">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-[#12151b] sticky top-0 h-screen">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <svg viewBox="0 0 36 36" className="w-9 h-9 shrink-0" aria-hidden="true">
            <defs><clipPath id="pkball-clip"><circle cx="18" cy="18" r="17" /></clipPath></defs>
            <g clipPath="url(#pkball-clip)">
              <rect x="0" y="0" width="36" height="36" fill="#f1f5f9" />
              <rect x="0" y="18" width="36" height="18" fill="#ef4444" />
              <rect x="0" y="14.5" width="36" height="7" fill="#0e1014" />
            </g>
            <circle cx="18" cy="18" r="17" fill="none" stroke="#0e1014" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="6" fill="#f1f5f9" stroke="#0e1014" strokeWidth="1.5" />
            <text x="18" y="18.6" textAnchor="middle" dominantBaseline="central" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="800" fontSize="9" fill="#0e1014">P</text>
          </svg>
          <div>
            <div className="font-bold tracking-tight leading-none">PokePortfolio</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">Collector Hub</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-slate-400 hover:text-white hover:bg-white/[0.03]"}`}>
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-slate-600 border-t border-white/5">Live data via Pokémon TCG API</div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto px-3 py-2 border-b border-white/5 bg-[#12151b] scrollbar-thin">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${isActive ? "bg-white/10 text-white" : "text-slate-400"}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}