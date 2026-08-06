#!/usr/bin/env node
/* =========================================================================
 * update-data.mjs
 * สร้าง src/data/{ammo,maps,hideout,tasks}.json จาก json.tarkov.dev (flat)
 * logic แปลงอยู่ที่ src/data/transforms.js (source เดียวกับที่ browser ใช้ live)
 *
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-data.mjs
 *          node scripts/update-data.mjs ammo tasks   (อัปเดตเฉพาะบางไฟล์)
 * ========================================================================= */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformAmmo, transformMaps, transformHideout, transformTasks } from '../src/data/transforms.js';

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

// โหลดแบบ cache (dataset ที่ใช้ร่วมกัน เช่น items/items_en จะดึงครั้งเดียว)
const CACHE = {};
const load = (name) => (CACHE[name] = CACHE[name] || fetchJson(`${BASE}/${name}`));

const DATASETS = {
  ammo: {
    file: 'ammo.json', indent: 4,
    build: async () => transformAmmo(await load('items'), await load('items_en')),
  },
  maps: {
    file: 'maps.json', indent: 4,
    build: async () => transformMaps(await load('maps'), await load('maps_en'), await load('items'), await load('items_en')),
  },
  hideout: {
    file: 'hideout.json', indent: 4,
    build: async () => transformHideout(await load('hideout'), await load('hideout_en'), await load('items'), await load('items_en')),
  },
  tasks: {
    file: 'tasks.json', indent: 2,
    build: async () => transformTasks(await load('tasks'), await load('tasks_en'), await load('maps_en'), await load('traders'), await load('items'), await load('items_en')),
  },
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
