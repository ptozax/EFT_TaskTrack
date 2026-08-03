#!/usr/bin/env node
/* =========================================================================
 * update-gear-data.mjs
 * ดึงไอเทมที่ "มีช่องเก็บของ/เกราะ" (rig / armored rig / backpack / container / armor)
 * -> public/gear_data.json ให้หน้า GearPreview ใช้
 *
 * แหล่งข้อมูล: json.tarkov.dev (flat file — แหล่งเดียวกับที่เว็บ tarkov.dev ใช้จริง)
 *   เพราะ GraphQL (api.tarkov.dev/graphql) ล่มอยู่ (issue #474) แต่ flat file ยังสด
 * ชื่อ/ไอคอน join จาก src/data/items.json (id ตรงกัน) เพราะ name ใน flat เป็น translation key
 *
 * วิธีใช้:  node scripts/update-gear-data.mjs   (npm run update-gear)
 * ========================================================================= */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITEMS_JSON = resolve(ROOT, 'src', 'data', 'items.json');
const OUT = resolve(ROOT, 'public', 'gear_data.json');
const FLAT = 'https://json.tarkov.dev/regular/items';
// layout ช่องจริง (row/col/width/height) ต่อไอเทม — สำหรับพวกที่พ็อกเก็ตจัดเรียงเป็นรูปทรงเฉพาะ
const GRIDS_URL = 'https://tarkov.dev/data/item-grids.min.json';

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const CATEGORY = {
  ItemPropertiesBackpack: () => 'backpack',
  ItemPropertiesContainer: () => 'container',
  ItemPropertiesChestRig: (p) => (p.class > 0 ? 'armored-rig' : 'rig'),
  ItemPropertiesArmor: () => 'armor',
};

async function main() {
  console.log('→ อ่าน items.json (ชื่อ/ไอคอน) ...');
  const localItems = JSON.parse(await readFile(ITEMS_JSON, 'utf8'));
  const meta = new Map(localItems.map((it) => [it.id, it]));

  console.log('→ ดึง items จาก json.tarkov.dev (flat file) ...');
  const json = await fetchJson(FLAT);
  const flat = json.data.items; // object keyed by id

  console.log('→ ดึง item-grids (layout ช่องจริง) ...');
  const gridLayouts = (await fetchJson(GRIDS_URL)) || {}; // { id: [{row,col,width,height}] }

  const items = Object.values(flat)
    .map((it) => {
      const p = it.properties || {};
      const catFn = CATEGORY[p.propertiesType];
      if (!catFn) return null;
      const category = catFn(p);
      const m = meta.get(it.id) || {};
      const grids = (p.grids || []).map((g) => ({ w: g.width, h: g.height }));
      // layout จริง (ถ้ามี) — ตำแหน่งพ็อกเก็ตเป็น row/col
      const layout = (gridLayouts[it.id] || []).map((g) => ({ row: g.row, col: g.col, w: g.width, h: g.height }));
      return {
        id: it.id,
        name: m.name || null,
        shortName: m.shortName || null,
        icon: m.gridImageLink || m.inspectImageLink || null,
        image: m.inspectImageLink || m.gridImageLink || null,
        weight: it.weight ?? null,
        category,
        capacity: p.capacity ?? (grids.reduce((s, g) => s + g.w * g.h, 0) || null),
        grids,
        layout, // [{row,col,w,h}] ถ้ามี layout เฉพาะ (ไม่งั้น [])
        armorClass: p.class ?? null,
        zones: p.zones || [],
        material: typeof p.material === 'string' ? p.material : (p.material?.name || null),
        penalties: { speed: p.speedPenalty ?? null, turn: p.turnPenalty ?? null, ergo: p.ergoPenalty ?? null },
      };
    })
    .filter((it) => it && it.name) // ต้องมีชื่อ (join กับ items.json ได้)
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = { updated: new Date().toISOString(), items };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));

  console.log(`✓ เขียนไฟล์ ${OUT}`);
  const byCat = {};
  items.forEach((it) => { byCat[it.category] = (byCat[it.category] || 0) + 1; });
  console.log(`  items: ${items.length} ·`, byCat);
}

main().catch((err) => {
  console.error('✗ ล้มเหลว:', err);
  process.exit(1);
});
