import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { getCardPrice, getRarityStyle } from "@/lib/pokemonApi";
import { playShiny } from "@/lib/sound";

function CardBack({ label }) {
  return (
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border border-white/10 grid place-items-center overflow-hidden">
      <div className="absolute inset-0 pk-shimmer" />
      <div className="relative w-11 h-11 rounded-full bg-white/10 grid place-items-center font-bold text-white text-lg">P</div>
      <div className="absolute bottom-2 text-[9px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}

export default function PackReveal({ pack, setName, chaseIds, onAddAll, onClose }) {
  const [pos, setPos] = useState(0);          // next index to pull from the deck
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const celebrated = useRef(new Set());
  const pullToken = useRef(0);

  const remaining = pack.length - pos;
  const allDone = pos === pack.length && !current;
  const totalValue = revealed.reduce((s, c) => s + getCardPrice(c), 0) + (current ? getCardPrice(current) : 0);

  const celebrate = (card) => {
    if (celebrated.current.has(card.id)) return;
    celebrated.current.add(card.id);
    playShiny();
    confetti({ particleCount: 140, spread: 110, startVelocity: 45, origin: { y: 0.45 }, colors: ["#fbbf24", "#a78bfa", "#34d399", "#60a5fa", "#fb7185", "#f472b6"] });
    const end = Date.now() + 900;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0, y: 0.7 }, colors: ["#fbbf24", "#a78bfa", "#34d399"] });
      confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1, y: 0.7 }, colors: ["#fbbf24", "#a78bfa", "#34d399"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const flipAfter = (card, token) => {
    setTimeout(() => {
      if (pullToken.current !== token) return;
      setFlipped(true);
      if (chaseIds?.has(card.id)) celebrate(card);
    }, 400);
  };

  const clickDeck = () => {
    if (allDone) return;
    pullToken.current += 1; // cancel any pending flip from a rapid previous click
    if (current) {
      // settle the center card into the revealed row, then pull the next one
      setRevealed((r) => [...r, current]);
      setCurrent(null);
      setFlipped(false);
      if (pos < pack.length) {
        const card = pack[pos];
        const token = pullToken.current;
        setPos(pos + 1);
        setCurrent(card);
        flipAfter(card, token);
      }
    } else if (pos < pack.length) {
      const card = pack[pos];
      const token = pullToken.current;
      setPos(pos + 1);
      setCurrent(card);
      flipAfter(card, token);
    }
  };

  const revealAll = () => {
    const rest = pack.slice(pos);
    if (current) { setRevealed((r) => [...r, current]); }
    setRevealed((r) => [...r, ...rest]);
    setPos(pack.length);
    setCurrent(null);
    setFlipped(false);
    rest.forEach((c) => { if (chaseIds?.has(c.id)) celebrate(c); });
  };

  const currentStyle = current ? getRarityStyle(current.rarity) : null;
  const isChase = current && chaseIds?.has(current.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col pk-fade-in">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/5">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {setName || "Pack Opening"}</div>
          <div className="font-bold text-lg">{allDone ? "Pack Revealed" : current ? "Tap the card to continue" : "Pull a card from the stack"}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Pack Value</div>
            <div className="font-bold text-emerald-400">${totalValue.toFixed(2)}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-auto">
        {/* Center stage: deck stack + the card being pulled */}
        <div
          onClick={!allDone ? clickDeck : undefined}
          className={`relative w-52 h-72 md:w-64 md:h-96 ${!allDone ? "cursor-pointer" : ""}`}
        >
          {/* deck backs (the stack facing the user) */}
          {!allDone && remaining > 0 && Array.from({ length: Math.min(remaining, 5) }).map((_, i) => (
            <div key={"deck" + i} className="absolute inset-0" style={{ transform: `translateY(${i * -3}px) translateX(${i * 2}px)`, zIndex: 5 + i }}>
              <CardBack label={setName} />
            </div>
          ))}

          {/* the card lifted off the stack, flipping to reveal */}
          {current && (
            <motion.div
              key={pos}
              className="absolute inset-0 z-20 pk-card-3d"
              initial={{ y: 0, scale: 1 }}
              animate={{ y: -36, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
            >
              <div className={`pk-card-inner relative w-full h-full ${flipped ? "pk-card-flipped" : ""}`}>
                <div className="pk-card-face absolute inset-0"><CardBack label={setName} /></div>
                <div className="pk-card-face pk-card-back absolute inset-0 rounded-xl overflow-hidden border border-white/10 bg-[#1a1d24]">
                  <img src={current.images?.large || current.images?.small} alt={current.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 ring-2 ring-inset rounded-xl" style={{ boxShadow: `inset 0 0 30px ${currentStyle.glow}` }} />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ color: currentStyle.color, background: "rgba(0,0,0,0.7)" }}>{current.rarity || "Card"}</div>
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-xs font-semibold text-emerald-400">${getCardPrice(current).toFixed(2)}</div>
                  {isChase && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-[10px] font-extrabold text-black flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3 h-3" /> CHASE
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* all done */}
          {allDone && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 grid place-items-center mx-auto mb-2"><Check className="w-8 h-8 text-emerald-400" /></div>
                <div className="font-semibold text-emerald-400">All cards revealed</div>
              </div>
            </div>
          )}

          {/* tap hint */}
          {!allDone && (
            <div className="absolute inset-x-0 -bottom-9 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
              {current ? "Tap the card to continue" : remaining > 0 ? `${remaining} card${remaining > 1 ? "s" : ""} left in the stack` : ""}
            </div>
          )}
        </div>

        {/* revealed row */}
        <div className="mt-10 w-full max-w-2xl">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Revealed · {revealed.length}/{pack.length}</div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin min-h-[5rem]">
            <AnimatePresence>
              {revealed.map((card, i) => {
                const cs = getRarityStyle(card.rarity);
                const chase = chaseIds?.has(card.id);
                return (
                  <motion.div
                    key={card.id + i}
                    initial={{ opacity: 0, scale: 0.75, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="flex-shrink-0 w-14 md:w-16 rounded-lg overflow-hidden border border-white/10 relative bg-[#1a1d24]"
                  >
                    <div className="aspect-[3/4]"><img src={card.images?.small} alt={card.name} className="w-full h-full object-cover" loading="lazy" /></div>
                    <div className="absolute inset-0 ring-1 ring-inset" style={{ boxShadow: `inset 0 0 14px ${cs.glow}` }} />
                    {chase && <div className="absolute top-0.5 right-0.5"><Sparkles className="w-3 h-3 text-amber-400" /></div>}
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-semibold text-emerald-400 text-center py-0.5">${getCardPrice(card).toFixed(2)}</div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-3">
        {!allDone ? (
          <>
            <Button variant="secondary" onClick={revealAll}>Reveal All</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </>
        ) : (
          <Button onClick={() => onAddAll(pack)} className="bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]"><Check className="w-4 h-4 mr-1.5" /> Add All to Binder</Button>
        )}
      </div>
    </div>
  );
}