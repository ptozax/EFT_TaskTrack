#!/usr/bin/env node
/* =========================================================================
 * update-optimizer-data.mjs
 * ดึงข้อมูลปืน+มอด จาก json.tarkov.dev (flat) -> public/optimizer_data.json
 * logic แปลงอยู่ที่ src/data/transforms.js (source เดียวกับที่ browser ใช้ live)
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-optimizer-data.mjs
 * ========================================================================= */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformOptimizer } from '../src/data/transforms.js';

const BASE = 'https://json.tarkov.dev/regular';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'optimizer_data.json');

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
  console.log('→ ดึง items / items_en / traders จาก flat file ...');
  const [items, en, traders] = await Promise.all([
    fetchJson(`${BASE}/items`), fetchJson(`${BASE}/items_en`), fetchJson(`${BASE}/traders`),
  ]);
  const out = transformOptimizer(items, en, traders);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  const barrels = Object.values(out.mods).filter((m) => m.moa != null).length;
  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  guns: ${out.guns.length}  |  mods: ${Object.keys(out.mods).length}  |  barrels(moa): ${barrels}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
