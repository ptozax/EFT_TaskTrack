#!/usr/bin/env node
/* =========================================================================
 * update-data.mjs
 * ดึงข้อมูลสดจาก tarkov.dev GraphQL แล้วเขียนทับไฟล์ใน src/data/
 *
 * ไฟล์ที่อัปเดต (shape ตรงกับที่ src ใช้งานอยู่):
 *   - ammo.json      (ballistics — src/pages/Balistic.jsx)
 *   - items.json     (ราคา/ไอเทม — src/pages/ItemPrice.jsx)
 *   - hideout.json   (hideout — src/pages/Hideout.jsx)
 *   - maps.json      (extracts/transits/locks — src/pages/MapPage.jsx)
 *   - tasks.json     (เควส — ใช้หลายหน้า import จาก ../data/tasks)
 *
 * หมายเหตุ: quests.json (รูปแบบ tarkovdata เก่า) ไม่มีที่ไหน import แล้ว
 *           จึงไม่ถูกแตะต้องโดยสคริปต์นี้
 *
 * วิธีใช้:  npm run update-data       หรือ   node scripts/update-data.mjs
 *          node scripts/update-data.mjs ammo tasks   (อัปเดตเฉพาะบางไฟล์)
 * ========================================================================= */

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.tarkov.dev/graphql';
const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

/* ---- fragments ที่ใช้ซ้ำ -------------------------------------------------- */

// ไอเทมแบบย่อ (ใช้ใน rewards / objectives / neededKeys ของ tasks)
const ITEM_PARTS = `
  id
  name
  shortName
  link
  wikiLink
  image512pxLink
  image8xLink
  gridImageLink
  baseImageLink
  iconLink
  backgroundColor`;

// ไอเทมแบบย่อสำหรับ hideout (ตรงกับ shape เดิมในไฟล์)
const HIDEOUT_ITEM = `
  id
  name
  baseImageLink
  image512pxLink
  image8xLink
  imageLink
  inspectImageLink`;

const XYZ = `x y z`;
const HEALTH_EFFECT = `bodyParts effects time { compareMethod value }`;
const ZONES = `
  zones {
    id
    position { ${XYZ} }
    outline { ${XYZ} }
    top
    bottom
    map { id }
  }`;

/* ---- queries รายชุดข้อมูล ------------------------------------------------- */

const AMMO_QUERY = `
query { ammo {
  accuracy
  ammoType
  armorDamage
  caliber
  damage
  fragmentationChance
  heavyBleedModifier
  initialSpeed
  penetrationChance
  penetrationPower
  lightBleedModifier
  penetrationPowerDeviation
  recoil
  tracer
  tracerColor
  weight
  recoilModifier
  ricochetChance
  stackMaxSize
  staminaBurnPerDamage
  item {
    id
    image512pxLink
    image8xLink
    imageLink
    inspectImageLink
    name
    normalizedName
    iconLink
  }
} }`;

const ITEMS_QUERY = `
query { items {
  id
  name
  shortName
  normalizedName
  basePrice
  height
  width
  baseImageLink
  gridImageLink
  wikiLink
  inspectImageLink
  lastLowPrice
  sellFor { currency price priceRUB source }
  buyFor  { currency price priceRUB source }
} }`;

const HIDEOUT_QUERY = `
query { hideoutStations {
  name
  imageLink
  id
  levels {
    constructionTime
    description
    level
    skillRequirements { id level name skill { name imageLink id } }
    stationLevelRequirements { id level station { id imageLink name } }
    crafts {
      duration
      id
      requiredQuestItems { id name }
      requiredItems { attributes { name type value } count quantity item { ${HIDEOUT_ITEM} } }
      rewardItems     { attributes { name type value } count quantity item { ${HIDEOUT_ITEM} } }
    }
    itemRequirements {
      attributes { name type value }
      count
      id
      quantity
      item { ${HIDEOUT_ITEM} }
    }
  }
} }`;

const MAPS_QUERY = `
query { maps {
  id
  name
  extracts  { outline { ${XYZ} } position { ${XYZ} } name id faction }
  transits  { outline { ${XYZ} } position { ${XYZ} } description conditions id }
  locks {
    outline { ${XYZ} }
    position { ${XYZ} }
    key {
      name id
      image512pxLink image8xLink imageLink imageLinkFallback inspectImageLink
    }
  }
} }`;

const TASKS_QUERY = `
query { tasks {
  id
  tarkovDataId
  name
  kappaRequired
  lightkeeperRequired
  experience
  wikiLink
  minPlayerLevel
  taskRequirements { status task { id name } }
  traderLevelRequirements { level trader { id name } }
  factionName
  neededKeys { map { id name } keys { ${ITEM_PARTS} } }
  taskImageLink
  trader { id name }
  map { id name }
  startRewards  { ...RewardParts }
  objectives    { ...ObjectiveParts }
  finishRewards { ...RewardParts }
} }

fragment RewardParts on TaskRewards {
  traderStanding { standing trader { id name } }
  items { count item { ${ITEM_PARTS} containsItems { count item { ${ITEM_PARTS} } } } }
  offerUnlock { id level trader { id name } item { ${ITEM_PARTS} } }
  skillLevelReward { name level }
  traderUnlock { id name }
}

fragment ObjectiveParts on TaskObjective {
  id
  description
  type
  optional
  __typename
  maps { id name }
  ... on TaskObjectiveBasic { ${ZONES} }
  ... on TaskObjectiveItem {
    count foundInRaid dogTagLevel maxDurability minDurability
    item { ${ITEM_PARTS} } ${ZONES}
  }
  ... on TaskObjectiveShoot {
    shotType target count zoneNames bodyParts distance { compareMethod value }
    usingWeapon { ${ITEM_PARTS} } usingWeaponMods { ${ITEM_PARTS} }
    wearing { ${ITEM_PARTS} } notWearing { ${ITEM_PARTS} }
    playerHealthEffect { ${HEALTH_EFFECT} } enemyHealthEffect { ${HEALTH_EFFECT} }
    ${ZONES}
  }
  ... on TaskObjectiveExtract { exitStatus zoneNames }
  ... on TaskObjectiveQuestItem {
    count questItem { id name } possibleLocations { positions { ${XYZ} } map { id } } ${ZONES}
  }
  ... on TaskObjectiveBuildItem {
    item { ${ITEM_PARTS} }
    containsAll { ${ITEM_PARTS} }
    containsOne { ${ITEM_PARTS} }
    attributes { name requirement { compareMethod value } }
  }
  ... on TaskObjectiveExperience { healthEffect { ${HEALTH_EFFECT} } }
  ... on TaskObjectiveSkill { skillLevel { name level } }
  ... on TaskObjectiveMark { markerItem { ${ITEM_PARTS} } ${ZONES} }
  ... on TaskObjectiveTaskStatus { status task { id name } }
  ... on TaskObjectiveTraderLevel { level trader { id name } }
  ... on TaskObjectiveUseItem { count useAny { ${ITEM_PARTS} } ${ZONES} }
}`;

/* ---- นิยามงานอัปเดตแต่ละไฟล์ --------------------------------------------- */
// indent: ตรงกับรูปแบบเดิมของแต่ละไฟล์ (ammo/items/hideout/maps = 4, tasks = 2)
const DATASETS = {
  ammo:    { file: 'ammo.json',    query: AMMO_QUERY,    key: 'ammo',           indent: 4 },
  items:   { file: 'items.json',   query: ITEMS_QUERY,   key: 'items',          indent: 4 },
  hideout: { file: 'hideout.json', query: HIDEOUT_QUERY, key: 'hideoutStations', indent: 4 },
  maps:    { file: 'maps.json',    query: MAPS_QUERY,    key: 'maps',           indent: 4 },
  tasks:   { file: 'tasks.json',   query: TASKS_QUERY,   key: 'tasks',          indent: 2 },
};

async function fetchData(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
      return json.data;
    } catch (err) {
      console.warn(`    ! attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function updateDataset(name) {
  const ds = DATASETS[name];
  const out = resolve(DATA_DIR, ds.file);
  process.stdout.write(`→ ${ds.file} ... `);
  const data = await fetchData(ds.query);
  const arr = data[ds.key];
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`ไม่มีข้อมูล (${ds.key}) — ยกเลิกการเขียนทับ ${ds.file}`);
  }
  await writeFile(out, JSON.stringify(arr, null, ds.indent));
  console.log(`✓ ${arr.length} รายการ`);
}

async function main() {
  const requested = process.argv.slice(2);
  const names = requested.length ? requested : Object.keys(DATASETS);

  const unknown = names.filter((n) => !DATASETS[n]);
  if (unknown.length) {
    console.error(`✗ ไม่รู้จักชุดข้อมูล: ${unknown.join(', ')}`);
    console.error(`  เลือกได้: ${Object.keys(DATASETS).join(', ')}`);
    process.exit(1);
  }

  console.log(`อัปเดตจาก tarkov.dev: ${names.join(', ')}\n`);
  const failed = [];
  for (const name of names) {
    try {
      await updateDataset(name);
    } catch (err) {
      failed.push(name);
      console.log(`✗ ${name}: ${err.message}`);
    }
  }

  console.log('');
  if (failed.length) {
    console.error(`เสร็จแบบมีข้อผิดพลาด — ล้มเหลว: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('เสร็จสมบูรณ์ ✓');
}

main().catch((err) => {
  console.error('✗ ล้มเหลว:', err);
  process.exit(1);
});
