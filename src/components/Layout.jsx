import { Outlet, NavLink } from "react-router-dom";
import { Home, Sparkles, BookOpen, Search, Heart, Store, ListChecks } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/packs", label: "Pack Opening", icon: Sparkles, end: false },
  { to: "/binder", label: "Binder", icon: BookOpen, end: false },
  { to: "/search", label: "Search", icon: Search, end: false },
  { to: "/wishlist", label: "Wishlist", icon: Heart, end: false },
  { to: "/marketplace", label: "Marketplace", icon: Store, end: false },
  { to: "/setlist", label: "Set List", icon: ListChecks, end: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#0e1014] text-slate-100">
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/5 bg-[#12151b] sticky top-0 h-screen">
        <div className="px-6 py-7 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 grid place-items-center font-bold text-[#0e1014]">P</div>
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