#!/usr/bin/env node
/* =========================================================================
 * update-loot.mjs
 * สร้าง public/loot_data.json — จุด loot ตายตัว (lootLoose) ต่อแมพต่อ item
 * ให้ MapPage (Item Tracker) ปักหมุด · logic อยู่ที่ src/data/transforms.js
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-loot.mjs
 * ========================================================================= */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformLoot } from '../src/data/transforms.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'loot_data.json');

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

async function main() {
  console.log('→ ดึง maps จาก flat file ...');
  const maps = await fetchJson('https://json.tarkov.dev/regular/maps');
  const out = transformLoot(maps);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  const mapsN = Object.keys(out).length;
  const itemsN = new Set(Object.values(out).flatMap((m) => Object.keys(m))).size;
  const pts = Object.values(out).reduce((s, m) => s + Object.values(m).reduce((t, a) => t + a.length, 0), 0);
  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  maps: ${mapsN} | items(fixed spawn): ${itemsN} | จุดรวม: ${pts}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
