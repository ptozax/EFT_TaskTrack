#!/usr/bin/env node
/* =========================================================================
 * update-price-data.mjs
 * สร้าง public/price_data.json จาก src/data/items.json + barter (flat)
 * logic แปลงอยู่ที่ src/data/transforms.js (source เดียวกับที่ browser ใช้ live)
 * ราคาจะ fresh ตาม items.json ล่าสุด — รัน update-items ก่อนถ้าอยากอัปเดตราคา
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-price-data.mjs
 * ========================================================================= */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformPriceData } from '../src/data/transforms.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src', 'data', 'items.json');
const OUT = resolve(ROOT, 'public', 'price_data.json');
const BASE = 'https://json.tarkov.dev/regular';

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! fetch ${url} attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) return null; // best-effort: ไม่มี barter ก็ทำต่อได้
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

async function main() {
  console.log('→ อ่าน src/data/items.json ...');
  const itemsArr = JSON.parse(await readFile(SRC, 'utf8'));

  console.log('→ ดึง barter/traders จาก json.tarkov.dev (flat file) ...');
  const [barters, traders] = await Promise.all([fetchJson(`${BASE}/barters`), fetchJson(`${BASE}/traders`)]);
  if (barters) console.log('  ✓ ได้ barter'); else console.log('  ! ดึง barter ไม่ได้ — ทำต่อโดยไม่มี barter');

  // updated = วันที่ของ items.json จริง (สะท้อนความสดของ "ราคา")
  const srcStat = await stat(SRC);
  const out = transformPriceData(itemsArr, barters, traders, srcStat.mtime.toISOString());
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  items: ${out.items.length} / ${itemsArr.length}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
