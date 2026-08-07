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

const CHUNK = 250;

// Pull every card currently in the binder as CollectionCard records.
async function getBinderCards() {
  try {
    return await base44.entities.CollectionCard.list("-created_date", 1000);
  } catch {
    return [];
  }
}

function cardToEntry(c) {
  return {
    set_id: c.set_id,
    set_name: c.set_name,
    card_id: c.card_id,
    card_number: c.number,
    name: c.name,
    image_small: c.image_small,
    rarity: c.rarity,
    date_checked: new Date().toISOString(),
  };
}

// When auto-tick is turned ON: tick every card already in the binder (one entry
// per unique card_id, de-duplicated against existing checklist entries).
export async function backTickFromBinder() {
  const cards = await getBinderCards();
  if (!cards.length) return { created: 0 };

  const seen = new Set();
  const entries = [];
  for (const c of cards) {
    if (!c.card_id || !c.set_id || seen.has(c.card_id)) continue;
    seen.add(c.card_id);
    entries.push(cardToEntry(c));
  }
  if (!entries.length) return { created: 0 };

  const ids = [...seen];
  const existing = new Set();
  for (let i = 0; i < ids.length; i += CHUNK) {
    try {
      const rows = await base44.entities.SetChecklist.filter({ card_id: { $in: ids.slice(i, i + CHUNK) } });
      rows.forEach((r) => existing.add(r.card_id));
    } catch {}
  }
  const toCreate = entries.filter((e) => !existing.has(e.card_id));
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    try {
      await base44.entities.SetChecklist.bulkCreate(toCreate.slice(i, i + CHUNK));
    } catch {}
  }
  return { created: toCreate.length };
}

// When auto-tick is turned OFF: untick (delete) every checklist entry whose card
// is currently in the binder. Manual ticks for cards not in the binder are kept.
export async function unTickFromBinder() {
  const cards = await getBinderCards();
  if (!cards.length) return { removed: 0 };

  const ids = [...new Set(cards.map((c) => c.card_id).filter(Boolean))];
  let removed = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    try {
      await base44.entities.SetChecklist.deleteMany({ card_id: { $in: ids.slice(i, i + CHUNK) } });
    } catch {}
  }
  return { removed: ids.length };
}