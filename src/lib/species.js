// Species name extraction — strips TCG competitive suffixes/prefixes from
// card names to group cards by Pokémon species (Dex-style species collecting).
// e.g. "Charizard ex" → "Charizard", "M Charizard EX" → "Charizard",
//      "Charizard VMAX" → "Charizard", "Charizard & Reshiram" → "Charizard & Reshiram"

const PREFIXES = [
  /^(M |Mega |Team Rocket's |Cynthia's |Brock's |Misty's |Lt\. Surge's |Erika's |Sabrina's |Blaine's |Giovanni's |Koga's |Lance's |Clair's |Whitney's |Chuck's |Pryce's |Jasmine's |Morty's |Falkner's |Eusine's |Archie's |Maxie's )/i,
];

const SUFFIXES = [
  /\s+(ex|EX|gx|GX|vstar|VSTAR|vmax|VMAX|v-union|V-UNION|lv\.x|LV\.X|tag team|TAG TEAM|Prism Star|Break|Shining|Shiny|Radiant|Ancient|Future|ACE|Ace Spec|◆|☆|★)$/i,
  /\s+(v|V)$/i, // standalone V (after other suffixes already stripped)
];

export function getSpeciesName(name = "") {
  let n = name.trim();
  for (const re of PREFIXES) n = n.replace(re, "");
  for (const re of SUFFIXES) n = n.replace(re, "");
  return n.trim() || name.trim();
}

// Group a list of card objects (CollectionCard or TCG API cards) by species.
// Returns an array of { species, cards, count, value, bestCard } sorted by value desc.
export function groupBySpecies(cards, getPrice) {
  const groups = {};
  for (const c of cards) {
    const species = getSpeciesName(c.name || c.name || "");
    if (!groups[species]) groups[species] = { species, cards: [], count: 0, value: 0, bestCard: null };
    const g = groups[species];
    const qty = c.quantity || 1;
    const price = getPrice ? getPrice(c) : (c.current_price || 0);
    const val = price * qty;
    g.cards.push(c);
    g.count += qty;
    g.value += val;
    if (!g.bestCard || val > (getPrice(g.bestCard) * (g.bestCard.quantity || 1))) g.bestCard = c;
  }
  return Object.values(groups).sort((a, b) => b.value - a.value);
}