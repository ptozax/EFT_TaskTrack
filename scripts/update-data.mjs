#!/usr/bin/env node
/* =========================================================================
 * update-data.mjs
 * ดึงข้อมูลสดจาก json.tarkov.dev (flat file — ไม่พึ่ง GraphQL) แล้วเขียนทับ src/data/
 * resolve ชื่อ/คำอธิบายจาก locale ต่อ dataset (<name>_en) + join item จาก regular/items
 *
 * ไฟล์ที่อัปเดต (shape ตรงกับที่ src ใช้งานอยู่):
 *   - ammo.json      (ballistics — src/pages/Balistic.jsx)
 *   - maps.json      (extracts/transits/locks — src/pages/MapPage.jsx)
 *   - hideout.json   (hideout — src/pages/Hideout.jsx)
 *   - tasks.json     (เควส — ใช้หลายหน้า import จาก ../data/tasks)
 *
 * หมายเหตุ:
 *   - items.json เดิมเคยอยู่ที่นี่ แต่ย้ายไป update-items.mjs (flat) แล้ว จึงไม่แตะ
 *   - ข้อจำกัดจาก flat: transit.conditions หาย, hideout skill.imageLink หาย,
 *     reward item.containsItems = [] (หน้าเว็บไม่ได้ใช้ field เหล่านี้)
 *
 * ต้องใช้ Node 18+ (global fetch)  ->  nvm use 22 && node scripts/update-data.mjs
 *          node scripts/update-data.mjs ammo tasks   (อัปเดตเฉพาะบางไฟล์)
 * ========================================================================= */

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://json.tarkov.dev/regular';
const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! ${url} attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/* ---- โหลด dataset + locale ที่ใช้ร่วมกัน --------------------------------- */
const CACHE = {};
async function load(name) {
  if (!CACHE[name]) CACHE[name] = fetchJson(`${BASE}/${name}`);
  return CACHE[name];
}

// type -> __typename (อ้างอิงจากผลเดิมของ GraphQL); type ใหม่ (dialogue/globalVariable) -> Basic
const TYPENAME = {
  visit: 'TaskObjectiveBasic',
  giveItem: 'TaskObjectiveItem',
  findItem: 'TaskObjectiveItem',
  plantItem: 'TaskObjectiveItem',
  sellItem: 'TaskObjectiveItem',
  shoot: 'TaskObjectiveShoot',
  extract: 'TaskObjectiveExtract',
  findQuestItem: 'TaskObjectiveQuestItem',
  giveQuestItem: 'TaskObjectiveQuestItem',
  plantQuestItem: 'TaskObjectiveQuestItem',
  buildWeapon: 'TaskObjectiveBuildItem',
  experience: 'TaskObjectiveExperience',
  skill: 'TaskObjectiveSkill',
  mark: 'TaskObjectiveMark',
  taskStatus: 'TaskObjectiveTaskStatus',
  traderLevel: 'TaskObjectiveTraderLevel',
  useItem: 'TaskObjectiveUseItem',
  traderStanding: 'TaskObjectiveTraderStanding',
  dialogue: 'TaskObjectiveBasic',
  globalVariable: 'TaskObjectiveBasic',
};

const titleCase = (s) =>
  (s || '').split(/[-\s]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
const spaceCaps = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2'); // HideoutManagement -> Hideout Management

/* =========================================================================
 * builders — คืน array ตาม shape ที่หน้าเว็บใช้
 * ========================================================================= */

async function buildAmmo() {
  const [{ data: itemsData }, { data: en }] = await Promise.all([load('items'), load('items_en')]);
  const items = itemsData.items;
  const name = (k) => en[k] ?? k;
  return Object.values(items)
    .filter((x) => x.properties?.propertiesType === 'ItemPropertiesAmmo')
    .map((x) => {
      const p = x.properties;
      return {
        accuracy: p.accuracyModifier ?? 0,
        ammoType: p.ammoType,
        armorDamage: p.armorDamage,
        caliber: p.caliber,
        damage: p.damage,
        fragmentationChance: p.fragmentationChance,
        heavyBleedModifier: p.heavyBleedModifier,
        initialSpeed: p.initialSpeed,
        penetrationChance: p.penetrationChance,
        penetrationPower: p.penetrationPower,
        lightBleedModifier: p.lightBleedModifier,
        penetrationPowerDeviation: p.penetrationPowerDeviation,
        recoil: p.recoilModifier ?? 0,
        tracer: p.tracer,
        tracerColor: p.tracerColor,
        weight: x.weight,
        recoilModifier: p.recoilModifier,
        ricochetChance: p.ricochetChance,
        stackMaxSize: p.stackMaxSize,
        staminaBurnPerDamage: p.staminaBurnPerDamage,
        item: {
          id: x.id,
          image512pxLink: x.image512pxLink,
          image8xLink: x.image8xLink,
          imageLink: x.inspectImageLink, // flat ไม่มี imageLink แยก (pattern -image.webp = inspect)
          inspectImageLink: x.inspectImageLink,
          name: name(x.name),
          normalizedName: x.normalizedName,
          iconLink: x.iconLink,
        },
      };
    });
}

async function buildMaps() {
  const [maps, mapsEn, { data: itemsData }, { data: itemsEn }] = await Promise.all([
    load('maps'), load('maps_en'), load('items'), load('items_en'),
  ]);
  const M = maps.data.maps;
  const men = mapsEn.data;
  const items = itemsData.items;
  const mapName = (id) => men[`${id} Name`] ?? titleCase((Object.values(M).find((x) => x.id === id) || {}).normalizedName) ?? id;
  const keyItem = (id) => {
    const it = items[id];
    if (!it) return { name: id, id, image512pxLink: null, image8xLink: null, imageLink: null, imageLinkFallback: null, inspectImageLink: null };
    return {
      name: itemsEn[it.name] ?? it.name,
      id: it.id,
      image512pxLink: it.image512pxLink,
      image8xLink: it.image8xLink,
      imageLink: it.inspectImageLink,
      imageLinkFallback: it.inspectImageLink,
      inspectImageLink: it.inspectImageLink,
    };
  };
  return Object.values(M).map((m) => ({
    id: m.id,
    name: mapName(m.id),
    extracts: (m.extracts || []).map((e) => ({
      outline: e.outline, position: e.position, name: e.name, id: e.id, faction: e.faction,
    })),
    transits: (m.transits || []).map((t) => ({
      outline: t.outline, position: t.position,
      description: men[t.description] ?? t.description, // FAC_TRANSIT_x_DESC -> "Transit to X"
      conditions: null, // flat ไม่มี transit.conditions
      id: t.id,
    })),
    locks: (m.locks || []).map((l) => ({
      outline: l.outline, position: l.position, key: keyItem(l.key),
    })),
  }));
}

async function buildHideout() {
  const [hideout, hideoutEn, { data: itemsData }, { data: itemsEn }] = await Promise.all([
    load('hideout'), load('hideout_en'), load('items'), load('items_en'),
  ]);
  const stations = hideout.data; // { id: station }
  const hen = hideoutEn.data;
  const items = itemsData.items;
  const stationName = (id) => { const s = stations[id]; return s ? (hen[s.name] ?? s.name) : id; };
  const hideoutItem = (id) => {
    const it = items[id];
    if (!it) return { id, name: id, baseImageLink: null, image512pxLink: null, image8xLink: null, imageLink: null, inspectImageLink: null };
    return {
      id: it.id,
      name: itemsEn[it.name] ?? it.name,
      baseImageLink: it.baseImageLink,
      image512pxLink: it.image512pxLink,
      image8xLink: it.image8xLink,
      imageLink: it.inspectImageLink,
      inspectImageLink: it.inspectImageLink,
    };
  };

  return Object.values(stations).map((st) => ({
    name: stationName(st.id),
    imageLink: st.imageLink,
    id: st.id,
    levels: (st.levels || []).map((lvl) => ({
      constructionTime: lvl.constructionTime,
      description: hen[lvl.description] ?? lvl.description,
      level: lvl.level,
      skillRequirements: (lvl.skillRequirements || []).map((r) => ({
        id: r.id, level: r.level,
        name: spaceCaps(r.skill), // shape เดิม: name + skill{name,imageLink,id}
        skill: { name: spaceCaps(r.skill), imageLink: null, id: r.skill }, // flat ไม่มี skill image
      })),
      stationLevelRequirements: (lvl.stationLevelRequirements || []).map((r) => ({
        id: r.id, level: r.level,
        station: { id: r.station, imageLink: (stations[r.station] || {}).imageLink ?? null, name: stationName(r.station) },
      })),
      itemRequirements: (lvl.itemRequirements || []).map((r) => ({
        attributes: r.attributes
          ? Object.entries(r.attributes).map(([k, v]) => ({ name: k, type: k, value: String(v) }))
          : [],
        count: r.count,
        id: r.id,
        quantity: r.count,
        item: hideoutItem(r.item),
      })),
      crafts: [], // หน้าเว็บไม่ได้ใช้ (crafts เป็น dataset แยกใน flat)
    })),
  }));
}

async function buildTasks() {
  const [tasks, tasksEn, maps, mapsEn, traders, { data: itemsData }, { data: itemsEn }] = await Promise.all([
    load('tasks'), load('tasks_en'), load('maps'), load('maps_en'), load('traders'), load('items'), load('items_en'),
  ]);
  const T = tasks.data.tasks; // { id: task }
  const ten = tasksEn.data;
  const men = mapsEn.data;
  const items = itemsData.items;
  const iname = (id) => (items[id] ? (itemsEn[items[id].name] ?? items[id].name) : id);

  // resolvers
  const tName = (id) => ten[`${id} name`] ?? ten[`${id} Name`] ?? id;
  const oDesc = (key) => ten[key] ?? key;
  const mapName = (id) => (id ? (men[`${id} Name`] ?? id) : null);
  const traderName = {};
  Object.values(traders.data.traders || traders.data).forEach((t) => { if (t?.id) traderName[t.id] = titleCase(t.normalizedName); });
  const trName = (id) => traderName[id] ?? id;
  // quest items (dataset แยก)
  const qiName = {};
  (Object.values(tasks.data.questItems || {})).forEach((q) => { qiName[q.id] = ten[q.name] ?? q.normalizedName ?? q.id; });

  // ITEM_PARTS
  const itemPart = (id) => {
    const it = items[id];
    if (!it) return null;
    return {
      id: it.id, name: itemsEn[it.name] ?? it.name, shortName: itemsEn[it.shortName] ?? it.shortName,
      link: it.link ?? null, wikiLink: it.wikiLink ?? null,
      image512pxLink: it.image512pxLink, image8xLink: it.image8xLink, gridImageLink: it.gridImageLink,
      baseImageLink: it.baseImageLink, iconLink: it.iconLink, backgroundColor: it.backgroundColor,
    };
  };
  const parts = (ids) => (ids || []).flat().map(itemPart).filter(Boolean);
  const mapsOf = (ids) => (ids || []).map((id) => ({ id, name: mapName(id) }));
  const zonesOf = (zs) => (zs || []).map((z) => ({ id: z.id, position: z.position, outline: z.outline, top: z.top ?? null, bottom: z.bottom ?? null, map: { id: z.map } }));

  const buildObjective = (o) => {
    const base = {
      id: o.id, description: oDesc(o.description), type: o.type, optional: !!o.optional,
      __typename: TYPENAME[o.type] || 'TaskObjectiveBasic', maps: mapsOf(o.maps),
    };
    switch (TYPENAME[o.type]) {
      case 'TaskObjectiveItem':
        return { ...base, count: o.count, foundInRaid: !!o.foundInRaid, dogTagLevel: o.dogTagLevel ?? null,
          maxDurability: o.maxDurability ?? null, minDurability: o.minDurability ?? null,
          item: itemPart((o.items || [])[0]), zones: zonesOf(o.zones) };
      case 'TaskObjectiveShoot':
        return { ...base, shotType: o.shotType, target: (o.targetNames || [])[0] ?? null, count: o.count,
          zoneNames: o.zoneNames || [], bodyParts: o.bodyParts || [], distance: o.distance ?? null,
          usingWeapon: parts(o.usingWeapon), usingWeaponMods: parts(o.usingWeaponMods),
          wearing: parts(o.wearing), notWearing: parts(o.notWearing),
          playerHealthEffect: o.playerHealthEffect ?? null, enemyHealthEffect: o.enemyHealthEffect ?? null,
          zones: zonesOf(o.zones) };
      case 'TaskObjectiveExtract':
        return { ...base, exitStatus: o.exitStatus || [], zoneNames: o.exitName ? [o.exitName] : [] };
      case 'TaskObjectiveQuestItem':
        return { ...base, count: o.count ?? 1, questItem: { id: o.questItem, name: qiName[o.questItem] ?? o.questItem },
          possibleLocations: (o.possibleLocations || []).map((l) => ({ positions: l.positions, map: { id: l.map } })),
          zones: zonesOf(o.zones) };
      case 'TaskObjectiveBuildItem':
        return { ...base, item: itemPart(o.item), containsAll: parts(o.containsAll), containsOne: parts(o.containsOne),
          attributes: Object.entries(o.buildAttributes || {}).map(([name, r]) => ({ name, requirement: { compareMethod: r.compareMethod ?? '>=', value: r.value } })) };
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
      default: // Basic / TraderStanding / dialogue / globalVariable
        return { ...base, zones: zonesOf(o.zones) };
    }
  };

  const rewardItem = (r) => ({ count: r.count, item: itemPart(r.item) ? { ...itemPart(r.item), containsItems: [] } : null });
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
    id: t.id,
    tarkovDataId: t.tarkovDataId ?? null, // flat ไม่มี
    name: tName(t.id),
    kappaRequired: !!t.kappaRequired,
    lightkeeperRequired: !!t.lightkeeperRequired,
    experience: t.experience ?? 0,
    wikiLink: t.wikiLink ?? null,
    minPlayerLevel: t.minPlayerLevel ?? 0,
    taskRequirements: (t.taskRequirements || []).map((r) => ({ status: r.status || [], task: { id: r.task, name: tName(r.task) } })),
    traderLevelRequirements: (t.traderRequirements || [])
      .filter((r) => r.requirementType === 'level')
      .map((r) => ({ level: r.value, trader: { id: r.trader, name: trName(r.trader) } })),
    factionName: t.factionName ?? null,
    neededKeys: (t.neededKeys || []).map((nk) => ({ map: { id: nk.map, name: mapName(nk.map) }, keys: (nk.keys || []).map(itemPart).filter(Boolean) })),
    taskImageLink: t.taskImageLink ?? null,
    trader: { id: t.trader, name: trName(t.trader) },
    map: t.map ? { id: t.map, name: mapName(t.map) } : null,
    startRewards: buildRewards(t.startRewards),
    objectives: (t.objectives || []).map(buildObjective),
    finishRewards: buildRewards(t.finishRewards),
  }));
}

/* ---- นิยาม dataset ------------------------------------------------------- */
const DATASETS = {
  ammo: { file: 'ammo.json', build: buildAmmo, indent: 4 },
  maps: { file: 'maps.json', build: buildMaps, indent: 4 },
  hideout: { file: 'hideout.json', build: buildHideout, indent: 4 },
  tasks: { file: 'tasks.json', build: buildTasks, indent: 2 },
};

async function updateDataset(name) {
  const ds = DATASETS[name];
  process.stdout.write(`→ ${ds.file} ... `);
  const arr = await ds.build();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(`ไม่มีข้อมูล — ยกเลิกการเขียนทับ ${ds.file}`);
  await writeFile(resolve(DATA_DIR, ds.file), JSON.stringify(arr, null, ds.indent));
  console.log(`✓ ${arr.length} รายการ`);
}

async function main() {
  const requested = process.argv.slice(2);
  const names = requested.length ? requested : Object.keys(DATASETS);
  const unknown = names.filter((n) => !DATASETS[n]);
  if (unknown.length) {
    console.error(`✗ ไม่รู้จักชุดข้อมูล: ${unknown.join(', ')}\n  เลือกได้: ${Object.keys(DATASETS).join(', ')}`);
    process.exit(1);
  }
  console.log(`อัปเดตจาก json.tarkov.dev (flat): ${names.join(', ')}\n`);
  const failed = [];
  for (const name of names) {
    try { await updateDataset(name); } catch (err) { failed.push(name); console.log(`✗ ${name}: ${err.message}`); }
  }
  console.log('');
  if (failed.length) { console.error(`เสร็จแบบมีข้อผิดพลาด — ล้มเหลว: ${failed.join(', ')}`); process.exit(1); }
  console.log('เสร็จสมบูรณ์ ✓');
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
