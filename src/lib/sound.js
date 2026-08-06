// Synthesized "shiny" sparkle fanfare using the Web Audio API.
// No copyrighted audio — generated on the fly so it's safe to ship.
let ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, start, duration, gainPeak = 0.16, type = "triangle") {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function playShiny() {
  const ac = getCtx();
  if (!ac) return;
  // ascending sparkling arpeggio
  const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
  notes.forEach((f, i) => tone(f, i * 0.09, 0.5, 0.15, "triangle"));
  // shimmer tail
  tone(2093, 0.5, 0.7, 0.08, "sine");
  tone(2637, 0.62, 0.6, 0.06, "sine");
}