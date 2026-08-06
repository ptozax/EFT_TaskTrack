#!/usr/bin/env node
/* =========================================================================
 * update-items.mjs
 * สร้าง src/data/items.json จาก json.tarkov.dev (flat) — ราคา/buyFor/sellFor/LL สด
 * logic แปลงอยู่ที่ src/data/transforms.js (source เดียวกับที่ browser ใช้ live)
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-items.mjs
 * ========================================================================= */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformItems } from '../src/data/transforms.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'items.json');
const BASE = 'https://json.tarkov.dev/regular';

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
  const out = transformItems(items, en, traders);
  await writeFile(OUT, JSON.stringify(out));
  console.log(`✓ เขียน ${OUT}`);
  console.log(`  items: ${out.length}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
