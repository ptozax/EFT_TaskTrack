#!/usr/bin/env node
/* =========================================================================
 * update-gear-data.mjs
 * สร้าง public/gear_data.json (rig/armor/backpack/container + grid layout)
 * logic แปลงอยู่ที่ src/data/transforms.js (source เดียวกับที่ browser ใช้ live)
 * ชื่อ/ไอคอน join จาก src/data/items.json · layout จาก tarkov.dev/data/item-grids
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-gear-data.mjs
 * ========================================================================= */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformGear } from '../src/data/transforms.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ITEMS_JSON = resolve(ROOT, 'src', 'data', 'items.json');
const OUT = resolve(ROOT, 'public', 'gear_data.json');
const FLAT = 'https://json.tarkov.dev/regular/items';
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

async function main() {
  console.log('→ อ่าน items.json (ชื่อ/ไอคอน) ...');
  const itemsArr = JSON.parse(await readFile(ITEMS_JSON, 'utf8'));

  console.log('→ ดึง items + item-grids จาก tarkov.dev ...');
  const [flat, grids] = await Promise.all([fetchJson(FLAT), fetchJson(GRIDS_URL).catch(() => ({}))]);

  const out = transformGear(itemsArr, flat, grids || {});
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`✓ เขียนไฟล์ ${OUT}`);
  const byCat = {};
  out.items.forEach((it) => { byCat[it.category] = (byCat[it.category] || 0) + 1; });
  console.log(`  items: ${out.items.length} ·`, byCat);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
