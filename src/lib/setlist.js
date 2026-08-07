import { base44 } from "@/api/base44Client";

// The auto-tick preference is stored on the current user via updateMe.
export async function getAutoTickSetting() {
  try {
    const me = await base44.auth.me();
    return !!(me?.auto_tick_setlist ?? me?.data?.auto_tick_setlist);
  } catch {
    return false;
  }
}

export async function setAutoTickSetting(enabled) {
  await base44.auth.updateMe({ auto_tick_setlist: !!enabled });
}

// Called after cards are added to the binder. If the user has auto-tick enabled,
// each card is ticked on its set checklist (de-duplicated so re-adding a card
// already collected doesn't create a duplicate entry).
export async function autoTickFromBinder(cards) {
  if (!cards?.length) return;
  let on = false;
  try {
    on = await getAutoTickSetting();
  } catch {
    return;
  }
  if (!on) return;

  const entries = cards
    .map((c) => ({
      set_id: c.set?.id || c.set_id,
      set_name: c.set?.name || c.set_name,
      card_id: c.id || c.card_id,
      card_number: c.number,
      name: c.name,
      image_small: c.images?.small || c.image_small,
      rarity: c.rarity,
      date_checked: new Date().toISOString(),
    }))
    .filter((e) => e.set_id && e.card_id);
  if (!entries.length) return;

  const ids = entries.map((e) => e.card_id);
  let existing = [];
  try {
    existing = await base44.entities.SetChecklist.filter({ card_id: { $in: ids } });
  } catch {
    return;
  }
  const have = new Set(existing.map((r) => r.card_id));
  const toCreate = entries.filter((e) => !have.has(e.card_id));
  if (toCreate.length) {
    try {
      await base44.entities.SetChecklist.bulkCreate(toCreate);
    } catch {}
  }
}