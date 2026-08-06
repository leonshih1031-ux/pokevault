import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCardPrice, getRarityStyle } from "@/lib/pokemonApi";

function CardBack({ label }) {
  return (
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border border-white/10 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 pk-shimmer" />
      <div className="relative w-10 h-10 rounded-full bg-white/10 grid place-items-center font-bold text-white">P</div>
      <div className="absolute bottom-2 text-[9px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}

function FlipCard({ card, revealed, onReveal, index }) {
  const style = getRarityStyle(card.rarity);
  return (
    <button onClick={() => { if (!revealed) onReveal(index); }} className="pk-card-3d relative aspect-[3/4] w-full">
      <div className={`pk-card-inner relative w-full h-full ${revealed ? "pk-card-flipped" : ""}`}>
        <div className="pk-card-face absolute inset-0">
          <CardBack label={card.set?.name} />
        </div>
        <div className="pk-card-face pk-card-back absolute inset-0 rounded-xl overflow-hidden border border-white/10 bg-[#1a1d24]">
          <img src={card.images?.small} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 ring-2 ring-inset rounded-xl" style={{ boxShadow: `inset 0 0 26px ${style.glow}` }} />
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide" style={{ color: style.color, background: "rgba(0,0,0,0.65)" }}>{card.rarity || "Card"}</div>
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-semibold text-emerald-400">${getCardPrice(card).toFixed(2)}</div>
        </div>
      </div>
    </button>
  );
}

export default function PackReveal({ pack, setName, onAddAll, onClose }) {
  const [revealed, setRevealed] = useState([]);
  const allRevealed = revealed.length === pack.length;
  const totalValue = revealed.reduce((s, i) => s + getCardPrice(pack[i]), 0);

  const reveal = (i) => setRevealed((r) => (r.includes(i) ? r : [...r, i]));
  const revealAll = () => setRevealed(pack.map((_, i) => i));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col pk-fade-in">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/5">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {setName || "Pack Opening"}</div>
          <div className="font-bold text-lg">{allRevealed ? "Pack Revealed" : "Tap cards to reveal"}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Pack Value</div>
            <div className="font-bold text-emerald-400">${totalValue.toFixed(2)}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {pack.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 20 }}>
              <FlipCard card={card} revealed={revealed.includes(i)} onReveal={reveal} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="px-4 md:px-8 py-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-3">
        {!allRevealed ? (
          <Button variant="secondary" onClick={revealAll}>Reveal All</Button>
        ) : (
          <Button onClick={() => onAddAll(pack)} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]"><Check className="w-4 h-4 mr-1.5" /> Add All to Binder</Button>
        )}
      </div>
    </div>
  );
}