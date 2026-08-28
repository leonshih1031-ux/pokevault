// Local-storage backed preferences for post-pack behavior.
const KEY = "pk_pack_settings";

export function getPackSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { auto_add_to_binder: false, auto_delete_cards: false };
}

export function savePackSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
}