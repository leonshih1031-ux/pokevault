// Local-storage backed preferences for post-pack behavior.
const KEY = "pk_pack_settings";

export const PULL_DESTINATIONS = [
  { value: "manual", label: "Ask each time", desc: "Choose after reveal" },
  { value: "digital", label: "Digital Pulls only", desc: "Auto-add to Digital Pulls" },
  { value: "both", label: "Both binders", desc: "Auto-add to Main + Digital Pulls" },
  { value: "main", label: "Main binder only", desc: "Auto-add to Main" },
  { value: "none", label: "Don't add", desc: "Discard after reveal" },
];

export function getPackSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Migrate legacy boolean settings to the unified pull_destination.
      if (s.pull_destination === undefined) {
        if (s.auto_add_to_binder) s.pull_destination = "main";
        else if (s.auto_delete_cards) s.pull_destination = "none";
        else s.pull_destination = "manual";
      }
      return s;
    }
  } catch {}
  return { pull_destination: "manual" };
}

export function savePackSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
}