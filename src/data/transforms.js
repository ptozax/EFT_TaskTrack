/* =========================================================================
 * transforms.js  (pure — ใช้ได้ทั้ง browser และ node)
 * รวม logic แปลงข้อมูลดิบจาก json.tarkov.dev (flat file) -> shape ที่หน้าเว็บใช้
 * เป็น "แหล่งเดียว" ให้ทั้ง live fetch (gameStore.js) และ build scripts อ้างอิงตรงกัน
 *
 * ทุกฟังก์ชันรับ JSON ที่ parse แล้ว (raw .data objects) แล้วคืน shape เดียวกับไฟล์ static:
 *   transformItems(itemsJson, itemsEnJson, tradersJson)      -> items[]      (= src/data/items.json)
 *   transformPriceData(itemsArr, bartersJson, tradersJson)   -> {updated,items} (= public/price_data.json)
 *   transformGear(itemsArr, itemsJson, gridsJson)            -> {updated,items} (= public/gear_data.json)
 *   transformOptimizer(itemsJson, itemsEnJson, tradersJson)  -> {guns,mods}   (= public/optimizer_data.json)
 *   transformAmmo(itemsJson, itemsEnJson)                    -> ammo[]        (= src/data/ammo.json)
 *   transformMaps(mapsJson, mapsEnJson, itemsJson, itemsEnJson)     -> maps[]
 *   transformHideout(hideoutJson, hideoutEnJson, itemsJson, itemsEnJson) -> hideout[]
 *   transformTasks(tasksJson, tasksEnJson, mapsEnJson, tradersJson, itemsJson, itemsEnJson) -> tasks[]
 * ========================================================================= */

/* ---------- helpers ------------------------------------------------------ */
export const titleCase = (s) =>
  (s || '').split(/[-\s]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const spaceCaps = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2');

const tradersMap = (tradersJson, field = 'normalizedName') => {
  const out = {};
  Object.values(tradersJson.data.traders || tradersJson.data).forEach((t) => {
    if (t?.id) out[t.id] = t[field];
  });
  return out;
};

/* ========================================================================= *
 * items.json  (ItemPrice.jsx + ฐานของ price/gear)
 * ========================================================================= */
export function transformItems(itemsJson, itemsEnJson, tradersJson) {
  const items = itemsJson.data.items;
  const tr = itemsEnJson.data;
  const name = (key) => tr[key] ?? key;
  const traderName = tradersMap(tradersJson);

  return Object.values(items)
    .map((it) => {
      const buyFor = [
        ...(it.buyFromTrader || []).map((o) => ({
          source: traderName[o.trader] || o.trader,
          price: o.price, currency: o.currency, priceRUB: o.priceRUB,
          vendor: { minTraderLevel: o.minTraderLevel ?? null, buyLimit: o.buyLimit ?? null },
        })),
      ];
      if (it.avg24hPrice) buyFor.push({ source: 'fleaMarket', price: it.avg24hPrice, currency: 'RUB', priceRUB: it.avg24hPrice });

      const sellFor = [
        ...(it.sellToTrader || []).map((o) => ({
          source: traderName[o.trader] || o.trader,
          price: o.price, currency: o.currency, priceRUB: o.priceRUB,
        })),
      ];
      if (it.lastLowPrice) sellFor.push({ source: 'fleaMarket', price: it.lastLowPrice, currency: 'RUB', priceRUB: it.lastLowPrice });

      return {
        id: it.id, name: name(it.name), shortName: name(it.shortName), normalizedName: it.normalizedName,
        basePrice: it.basePrice, height: it.height, width: it.width,
        baseImageLink: it.baseImageLink, gridImageLink: it.gridImageLink, wikiLink: it.wikiLink,
        inspectImageLink: it.inspectImageLink, lastLowPrice: it.lastLowPrice ?? null,
        sellFor, buyFor,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ========================================================================= *
 * price_data.json  (PriceList.jsx) — รับ items ที่ transform แล้ว
 * ========================================================================= */
const CURRENCY_IDS = new Set(['5449016a4bdc2d6f028b456f', '5696686a4bdc2da3298b456a', '569668774bdc2da2298b4568']);

function barterMapFrom(bartersJson, tradersJson, meta) {
  if (!bartersJson) return null;
  const traderName = tradersJson ? tradersMap(tradersJson) : {};
  const barters = Object.values(bartersJson.data.barters || bartersJson.data);
  const map = {};
  for (const b of barters) {
    const req = (b.requiredItems || []).filter((r) => r.item);
    if (!req.length || req.every((r) => CURRENCY_IDS.has(r.item))) continue;
    const entry = {
      trader: traderName[b.trader] || b.trader,
      level: b.minTraderLevel ?? null,
      requiredItems: req.filter((r) => !CURRENCY_IDS.has(r.item)).map((r) => {
        const m = meta.get(r.item) || {};
        return { id: r.item, shortName: m.shortName || null, count: r.count, icon: m.gridImageLink || m.inspectImageLink || null };
      }),
    };
    const rewardId = b.offeredItem?.item;
    if (!rewardId) continue;
    (map[rewardId] = map[rewardId] || []).push(entry);
  }
  return map;
}

const traderBuys = (buyFor) =>
  (buyFor || [])
    .filter((b) => b && b.source !== 'fleaMarket' && b.priceRUB > 0)
    .map((b) => ({ source: b.source, price: b.price, currency: b.currency, priceRUB: b.priceRUB, level: b.vendor?.minTraderLevel ?? null, buyLimit: b.vendor?.buyLimit ?? null }))
    .sort((a, b) => a.priceRUB - b.priceRUB);
const fleaBuy = (buyFor) => {
  const f = (buyFor || []).find((b) => b && b.source === 'fleaMarket' && b.priceRUB > 0);
  return f ? { price: f.price, currency: f.currency, priceRUB: f.priceRUB } : null;
};
const bestTraderSell = (sellFor) => {
  const offers = (sellFor || []).filter((s) => s && s.source !== 'fleaMarket' && s.priceRUB > 0);
  if (!offers.length) return null;
  const s = offers.reduce((max, o) => (o.priceRUB > max.priceRUB ? o : max));
  return { source: s.source, price: s.price, currency: s.currency, priceRUB: s.priceRUB };
};

export function transformPriceData(itemsArr, bartersJson, tradersJson, updatedISO) {
  const meta = new Map(itemsArr.map((it) => [it.id, it]));
  const barterMap = barterMapFrom(bartersJson, tradersJson, meta);
  const items = itemsArr
    .map((it) => {
      const buys = traderBuys(it.buyFor);
      const buyFlea = fleaBuy(it.buyFor);
      const sell = bestTraderSell(it.sellFor);
      const fleaSell = (it.sellFor || []).find((s) => s.source === 'fleaMarket');
      const flea = it.lastLowPrice || fleaSell?.priceRUB || null;
      const barters = barterMap?.[it.id] || [];
      return {
        id: it.id, name: it.name, shortName: it.shortName,
        icon: it.gridImageLink || it.inspectImageLink || it.baseImageLink || null,
        buys, buyFlea, barters, sell, flea,
      };
    })
    .filter((it) => it.buys.length || it.buyFlea || it.barters.length)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { updated: updatedISO || new Date().toISOString(), items };
}

/* ========================================================================= *
 * gear_data.json  (GearPreview.jsx) — รับ items ที่ transform แล้ว + flat + grids
 * ========================================================================= */
const GEAR_CATEGORY = {
  ItemPropertiesBackpack: () => 'backpack',
  ItemPropertiesContainer: () => 'container',
  ItemPropertiesChestRig: (p) => (p.class > 0 ? 'armored-rig' : 'rig'),
  ItemPropertiesArmor: () => 'armor',
};

export function transformGear(itemsArr, itemsJson, gridsJson, updatedISO) {
  const meta = new Map(itemsArr.map((it) => [it.id, it]));
  const flat = itemsJson.data.items;
  const gridLayouts = gridsJson || {};
  const items = Object.values(flat)
    .map((it) => {
      const p = it.properties || {};
      const catFn = GEAR_CATEGORY[p.propertiesType];
      if (!catFn) return null;
      const category = catFn(p);
      const m = meta.get(it.id) || {};
      const grids = (p.grids || []).map((g) => ({ w: g.width, h: g.height }));
      const layout = (gridLayouts[it.id] || []).map((g) => ({ row: g.row, col: g.col, w: g.width, h: g.height }));
      return {
        id: it.id, name: m.name || null, shortName: m.shortName || null,
        icon: m.gridImageLink || m.inspectImageLink || null,
        image: m.inspectImageLink || m.gridImageLink || null,
        weight: it.weight ?? null, category,
        capacity: p.capacity ?? (grids.reduce((s, g) => s + g.w * g.h, 0) || null),
        grids, layout,
        armorClass: p.class ?? null, zones: p.zones || [],
        material: typeof p.material === 'string' ? p.material : (p.material?.name || null),
        penalties: { speed: p.speedPenalty ?? null, turn: p.turnPenalty ?? null, ergo: p.ergoPenalty ?? null },
      };
    })
    .filter((it) => it && it.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { updated: updatedISO || new Date().toISOString(), items };
}

/* ========================================================================= *
 * optimizer_data.json  (WeaponBuild / WeaponOptimizer / CaliberOptimizer)
 * ========================================================================= */
const MOD_PTYPES = new Set(['ItemPropertiesWeaponMod', 'ItemPropertiesMagazine', 'ItemPropertiesScope', 'ItemPropertiesBarrel']);
const buyPrice = (buyFor) => {
  const prices = (buyFor || []).map((b) => b.priceRUB).filter((p) => p != null && p > 0);
  return prices.length ? Math.min(...prices) : null;
};
const toPct = (v) => (v ? Math.round(v * 10000) / 100 : 0);
const prettySlot = (nameId, fallback) => {
  if (!nameId) return fallback || '';
  return nameId.replace(/^mod_/, '').split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};
const mapSlots = (slots) =>
  (slots || []).map((s) => ({ id: s.id, name: prettySlot(s.nameId, s.name), nameId: s.nameId, required: !!s.required, allowed: s.filters?.allowedItems || [] }));

export function transformOptimizer(itemsJson, itemsEnJson, tradersJson) {
  const items = itemsJson.data.items;
  const tr = itemsEnJson.data;
  const name = (key) => tr[key] ?? key;
  const traderName = {};
  Object.values(tradersJson.data.traders || tradersJson.data).forEach((t) => { if (t?.id) traderName[t.id] = titleCase(t.normalizedName) || t.id; });

  const mapBuyFor = (it) => {
    const out = (it.buyFromTrader || [])
      .filter((o) => o && o.priceRUB != null)
      .map((o) => ({ price: o.price, currency: o.currency, priceRUB: o.priceRUB, vendor: { name: traderName[o.trader] || o.trader } }));
    const noFlea = (it.types || []).includes('noFlea');
    if (!noFlea && it.avg24hPrice > 0) out.push({ price: it.avg24hPrice, currency: 'RUB', priceRUB: it.avg24hPrice, vendor: { name: 'Flea Market' } });
    return out;
  };

  const guns = Object.values(items)
    .filter((g) => g.properties?.propertiesType === 'ItemPropertiesWeapon')
    .map((g) => {
      const p = g.properties;
      const preset = p.defaultPreset ? items[p.defaultPreset] : null;
      const buyFor = mapBuyFor(g);
      return {
        id: g.id, name: name(g.name), shortName: name(g.shortName),
        caliber: p.caliber ? p.caliber.replace(/^Caliber/, '') : null,
        icon: g.iconLink || null,
        image: preset?.image512pxLink || g.image512pxLink || g.iconLink || null,
        ergo: p.ergonomics ?? 0, recoilV: p.recoilVertical ?? 0, recoilH: p.recoilHorizontal ?? 0,
        fireRate: p.fireRate ?? 0, moa: p.centerOfImpact ?? null, weight: g.weight ?? 0,
        price: buyPrice(buyFor), buyFor, slots: mapSlots(p.slots),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const mods = {};
  for (const m of Object.values(items)) {
    const p = m.properties;
    if (!p || !MOD_PTYPES.has(p.propertiesType)) continue;
    const buyFor = mapBuyFor(m);
    mods[m.id] = {
      id: m.id, name: name(m.name), shortName: name(m.shortName), types: m.types || [],
      icon: m.iconLink || null, ergo: p.ergonomics ?? 0, recoil: toPct(p.recoilModifier), acc: p.accuracyModifier ?? 0,
      moa: p.centerOfImpact ?? null, weight: m.weight ?? 0, capacity: p.capacity ?? null,
      price: buyPrice(buyFor), buyFor, conflicts: m.conflictingItems || [], slots: mapSlots(p.slots),
    };
  }
  return { guns, mods };
}

/* ========================================================================= *
 * ammo.json  (Balistic.jsx)
 * ========================================================================= */
export function transformAmmo(itemsJson, itemsEnJson) {
  const items = itemsJson.data.items;
  const en = itemsEnJson.data;
  const name = (k) => en[k] ?? k;
  return Object.values(items)
    .filter((x) => x.properties?.propertiesType === 'ItemPropertiesAmmo')
    .map((x) => {
      const p = x.properties;
      return {
        accuracy: p.accuracyModifier ?? 0, ammoType: p.ammoType, armorDamage: p.armorDamage, caliber: p.caliber,
        damage: p.damage, fragmentationChance: p.fragmentationChance, heavyBleedModifier: p.heavyBleedModifier,
        initialSpeed: p.initialSpeed, penetrationChance: p.penetrationChance, penetrationPower: p.penetrationPower,
        lightBleedModifier: p.lightBleedModifier, penetrationPowerDeviation: p.penetrationPowerDeviation,
        recoil: p.recoilModifier ?? 0, tracer: p.tracer, tracerColor: p.tracerColor, weight: x.weight,
        recoilModifier: p.recoilModifier, ricochetChance: p.ricochetChance, stackMaxSize: p.stackMaxSize,
        staminaBurnPerDamage: p.staminaBurnPerDamage,
        item: {
          id: x.id, image512pxLink: x.image512pxLink, image8xLink: x.image8xLink, imageLink: x.inspectImageLink,
          inspectImageLink: x.inspectImageLink, name: name(x.name), normalizedName: x.normalizedName, iconLink: x.iconLink,
        },
      };
    });
}

/* ========================================================================= *
 * maps.json  (MapPage.jsx)
 * ========================================================================= */
export function transformMaps(mapsJson, mapsEnJson, itemsJson, itemsEnJson) {
  const M = mapsJson.data.maps;
  const men = mapsEnJson.data;
  const items = itemsJson.data.items;
  const itemsEn = itemsEnJson.data;
  const mapName = (id) => men[`${id} Name`] ?? titleCase((Object.values(M).find((x) => x.id === id) || {}).normalizedName) ?? id;
  const keyItem = (id) => {
    const it = items[id];
    if (!it) return { name: id, id, image512pxLink: null, image8xLink: null, imageLink: null, imageLinkFallback: null, inspectImageLink: null };
    return {
      name: itemsEn[it.name] ?? it.name, id: it.id, image512pxLink: it.image512pxLink, image8xLink: it.image8xLink,
      imageLink: it.inspectImageLink, imageLinkFallback: it.inspectImageLink, inspectImageLink: it.inspectImageLink,
    };
  };
  return Object.values(M).map((m) => ({
    id: m.id, name: mapName(m.id),
    extracts: (m.extracts || []).map((e) => ({ outline: e.outline, position: e.position, name: e.name, id: e.id, faction: e.faction })),
    transits: (m.transits || []).map((t) => ({ outline: t.outline, position: t.position, description: men[t.description] ?? t.description, conditions: null, id: t.id })),
    locks: (m.locks || []).map((l) => ({ outline: l.outline, position: l.position, key: keyItem(l.key) })),
  }));
}

/* ========================================================================= *
 * hideout.json  (Hideout.jsx)
 * ========================================================================= */
export function transformHideout(hideoutJson, hideoutEnJson, itemsJson, itemsEnJson) {
  const stations = hideoutJson.data;
  const hen = hideoutEnJson.data;
  const items = itemsJson.data.items;
  const itemsEn = itemsEnJson.data;
  const stationName = (id) => { const s = stations[id]; return s ? (hen[s.name] ?? s.name) : id; };
  const hideoutItem = (id) => {
    const it = items[id];
    if (!it) return { id, name: id, baseImageLink: null, image512pxLink: null, image8xLink: null, imageLink: null, inspectImageLink: null };
    return {
      id: it.id, name: itemsEn[it.name] ?? it.name, baseImageLink: it.baseImageLink, image512pxLink: it.image512pxLink,
      image8xLink: it.image8xLink, imageLink: it.inspectImageLink, inspectImageLink: it.inspectImageLink,
    };
  };
  return Object.values(stations).map((st) => ({
    name: stationName(st.id), imageLink: st.imageLink, id: st.id,
    levels: (st.levels || []).map((lvl) => ({
      constructionTime: lvl.constructionTime, description: hen[lvl.description] ?? lvl.description, level: lvl.level,
      skillRequirements: (lvl.skillRequirements || []).map((r) => ({ id: r.id, level: r.level, name: spaceCaps(r.skill), skill: { name: spaceCaps(r.skill), imageLink: null, id: r.skill } })),
      stationLevelRequirements: (lvl.stationLevelRequirements || []).map((r) => ({ id: r.id, level: r.level, station: { id: r.station, imageLink: (stations[r.station] || {}).imageLink ?? null, name: stationName(r.station) } })),
      itemRequirements: (lvl.itemRequirements || []).map((r) => ({
        attributes: r.attributes ? Object.entries(r.attributes).map(([k, v]) => ({ name: k, type: k, value: String(v) })) : [],
        count: r.count, id: r.id, quantity: r.count, item: hideoutItem(r.item),
      })),
      crafts: [],
    })),
  }));
}

/* ========================================================================= *
 * loot_data.json  (MapPage — Item Tracker: จุด loot ตายตัวจาก lootLoose)
 *   ผลลัพธ์: { [mapId]: { [itemId]: [{x,y,z}, ...] } }
 *   หมายเหตุ: มีเฉพาะ item ที่มี "fixed spawn" (lootLoose) — item ที่สุ่มเกิดในกล่อง
 *   (เช่น battle-pass items) ไม่มีพิกัด จึงไม่อยู่ในนี้ (track ในลิสต์ได้แต่ไม่มีหมุด)
 * ========================================================================= */
export function transformLoot(mapsJson) {
  const M = mapsJson.data.maps;
  const out = {};
  for (const m of Object.values(M)) {
    const byItem = {};
    for (const l of m.lootLoose || []) {
      if (!l.position) continue;
      for (const it of l.items || []) {
        (byItem[it] = byItem[it] || []).push(l.position);
      }
    }
    if (Object.keys(byItem).length) out[m.id] = byItem;
  }
  return out;
}

/* ========================================================================= *
 * tasks.json  (QuestTree / MapPage / Kappa / home / AddQuest)
 * ========================================================================= */
const TYPENAME = {
  visit: 'TaskObjectiveBasic', giveItem: 'TaskObjectiveItem', findItem: 'TaskObjectiveItem', plantItem: 'TaskObjectiveItem',
  sellItem: 'TaskObjectiveItem', shoot: 'TaskObjectiveShoot', extract: 'TaskObjectiveExtract',
  findQuestItem: 'TaskObjectiveQuestItem', giveQuestItem: 'TaskObjectiveQuestItem', plantQuestItem: 'TaskObjectiveQuestItem',
  buildWeapon: 'TaskObjectiveBuildItem', experience: 'TaskObjectiveExperience', skill: 'TaskObjectiveSkill',
  mark: 'TaskObjectiveMark', taskStatus: 'TaskObjectiveTaskStatus', traderLevel: 'TaskObjectiveTraderLevel',
  useItem: 'TaskObjectiveUseItem', traderStanding: 'TaskObjectiveTraderStanding',
  dialogue: 'TaskObjectiveBasic', globalVariable: 'TaskObjectiveBasic',
};

export function transformTasks(tasksJson, tasksEnJson, mapsEnJson, tradersJson, itemsJson, itemsEnJson) {
  const T = tasksJson.data.tasks;
  const ten = tasksEnJson.data;
  const men = mapsEnJson.data;
  const items = itemsJson.data.items;
  const itemsEn = itemsEnJson.data;

  const tName = (id) => ten[`${id} name`] ?? ten[`${id} Name`] ?? id;
  const oDesc = (key) => ten[key] ?? key;
  const mapName = (id) => (id ? (men[`${id} Name`] ?? id) : null);
  const traderName = {};
  Object.values(tradersJson.data.traders || tradersJson.data).forEach((t) => { if (t?.id) traderName[t.id] = titleCase(t.normalizedName); });
  const trName = (id) => traderName[id] ?? id;
  const qiName = {};
  Object.values(tasksJson.data.questItems || {}).forEach((q) => { qiName[q.id] = ten[q.name] ?? q.normalizedName ?? q.id; });

  const itemPart = (id) => {
    const it = items[id];
    if (!it) return null;
    return {
      id: it.id, name: itemsEn[it.name] ?? it.name, shortName: itemsEn[it.shortName] ?? it.shortName,
      link: it.link ?? null, wikiLink: it.wikiLink ?? null, image512pxLink: it.image512pxLink, image8xLink: it.image8xLink,
      gridImageLink: it.gridImageLink, baseImageLink: it.baseImageLink, iconLink: it.iconLink, backgroundColor: it.backgroundColor,
    };
  };
  const parts = (ids) => (ids || []).flat().map(itemPart).filter(Boolean);
  const mapsOf = (ids) => (ids || []).map((id) => ({ id, name: mapName(id) }));
  const zonesOf = (zs) => (zs || []).map((z) => ({ id: z.id, position: z.position, outline: z.outline, top: z.top ?? null, bottom: z.bottom ?? null, map: { id: z.map } }));

  const buildObjective = (o) => {
    const base = { id: o.id, description: oDesc(o.description), type: o.type, optional: !!o.optional, __typename: TYPENAME[o.type] || 'TaskObjectiveBasic', maps: mapsOf(o.maps) };
    switch (TYPENAME[o.type]) {
      case 'TaskObjectiveItem':
        return { ...base, count: o.count, foundInRaid: !!o.foundInRaid, dogTagLevel: o.dogTagLevel ?? null, maxDurability: o.maxDurability ?? null, minDurability: o.minDurability ?? null, item: itemPart((o.items || [])[0]), zones: zonesOf(o.zones) };
      case 'TaskObjectiveShoot':
        return { ...base, shotType: o.shotType, target: (o.targetNames || [])[0] ?? null, count: o.count, zoneNames: o.zoneNames || [], bodyParts: o.bodyParts || [], distance: o.distance ?? null, usingWeapon: parts(o.usingWeapon), usingWeaponMods: parts(o.usingWeaponMods), wearing: parts(o.wearing), notWearing: parts(o.notWearing), playerHealthEffect: o.playerHealthEffect ?? null, enemyHealthEffect: o.enemyHealthEffect ?? null, zones: zonesOf(o.zones) };
      case 'TaskObjectiveExtract':
        return { ...base, exitStatus: o.exitStatus || [], zoneNames: o.exitName ? [o.exitName] : [] };
      case 'TaskObjectiveQuestItem':
        return { ...base, count: o.count ?? 1, questItem: { id: o.questItem, name: qiName[o.questItem] ?? o.questItem }, possibleLocations: (o.possibleLocations || []).map((l) => ({ positions: l.positions, map: { id: l.map } })), zones: zonesOf(o.zones) };
      case 'TaskObjectiveBuildItem':
        return { ...base, item: itemPart(o.item), containsAll: parts(o.containsAll), containsOne: parts(o.containsOne), attributes: Object.entries(o.buildAttributes || {}).map(([name, r]) => ({ name, requirement: { compareMethod: r.compareMethod ?? '>=', value: r.value } })) };
      case 'TaskObjectiveExperience':
        return { ...base, healthEffect: o.healthEffect ?? null };
      case 'TaskObjectiveSkill':
        return { ...base, skillLevel: { name: spaceCaps(o.skill), level: o.level } };
      case 'TaskObjectiveMark':
        return { ...base, markerItem: itemPart(o.markerItem), zones: zonesOf(o.zones) };
      case 'TaskObjectiveTaskStatus':
        return { ...base, status: o.status || [], task: { id: o.task, name: tName(o.task) } };
      case 'TaskObjectiveTraderLevel':
        return { ...base, level: o.level, trader: { id: o.trader, name: trName(o.trader) } };
      case 'TaskObjectiveUseItem':
        return { ...base, count: o.count, useAny: parts(o.useAny), zones: zonesOf(o.zones) };
      default:
        return { ...base, zones: zonesOf(o.zones) };
    }
  };

  const rewardItem = (r) => { const ip = itemPart(r.item); return { count: r.count, item: ip ? { ...ip, containsItems: [] } : null }; };
  const buildRewards = (rw) => {
    if (!rw) return { traderStanding: [], items: [], offerUnlock: [], skillLevelReward: [], traderUnlock: [] };
    return {
      traderStanding: (rw.traderStanding || []).map((s) => ({ standing: s.standing, trader: { id: s.trader, name: trName(s.trader) } })),
      items: (rw.items || []).map(rewardItem).filter((x) => x.item),
      offerUnlock: (rw.offerUnlock || []).map((o) => ({ id: o.id, level: o.level, trader: { id: o.trader, name: trName(o.trader) }, item: itemPart(o.item) })),
      skillLevelReward: (rw.skillLevelReward || []).map((s) => ({ name: spaceCaps(s.skill), level: s.level })),
      traderUnlock: (rw.traderUnlock || []).map((id) => (typeof id === 'string' ? { id, name: trName(id) } : { id: id.id ?? id, name: trName(id.id ?? id) })),
    };
  };

  return Object.values(T).map((t) => ({
    id: t.id, tarkovDataId: t.tarkovDataId ?? null, name: tName(t.id),
    kappaRequired: !!t.kappaRequired, lightkeeperRequired: !!t.lightkeeperRequired, experience: t.experience ?? 0,
    wikiLink: t.wikiLink ?? null, minPlayerLevel: t.minPlayerLevel ?? 0,
    taskRequirements: (t.taskRequirements || []).map((r) => ({ status: r.status || [], task: { id: r.task, name: tName(r.task) } })),
    traderLevelRequirements: (t.traderRequirements || []).filter((r) => r.requirementType === 'level').map((r) => ({ level: r.value, trader: { id: r.trader, name: trName(r.trader) } })),
    factionName: t.factionName ?? null,
    neededKeys: (t.neededKeys || []).map((nk) => ({ map: { id: nk.map, name: mapName(nk.map) }, keys: (nk.keys || []).map(itemPart).filter(Boolean) })),
    taskImageLink: t.taskImageLink ?? null, trader: { id: t.trader, name: trName(t.trader) },
    map: t.map ? { id: t.map, name: mapName(t.map) } : null,
    startRewards: buildRewards(t.startRewards), objectives: (t.objectives || []).map(buildObjective), finishRewards: buildRewards(t.finishRewards),
  }));
}
