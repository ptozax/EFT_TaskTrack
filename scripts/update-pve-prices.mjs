#!/usr/bin/env node
/* =========================================================================
 * update-pve-prices.mjs
 * สร้าง public/pve_prices.json = ราคาตลาด (flea market) ของโหมด PvE
 *
 * ทำไมต้องแยกไฟล์: PvE กับ PvP ใช้ตลาดคนละตัว ราคาต่างกันจริง
 * เช็คแล้ว 3,439 จาก 5,327 ไอเทมมีราคาตลาดไม่เท่ากัน
 *   Colt M4A1           PvP 25,000  / PvE 18,500
 *   Factory exit key    PvP 188,888 / PvE 550,000
 * ส่วน "ราคาเทรดเดอร์" เท่ากันเป๊ะทั้งสองโหมด (ต่างกัน 0 ไอเทม)
 * -> เก็บแค่ราคาตลาดพอ ไม่ต้องโคลนชุดข้อมูลทั้งก้อน (items.json หนัก 5.3 MB)
 *
 * รูปแบบที่เก็บ: { id: [ราคาขาย, ราคาซื้อ] } ใช้ array ให้ไฟล์เล็ก
 * ค่าเป็น RUB, null = ขาย/ซื้อในตลาดไม่ได้
 *
 * ต้องใช้ Node 18+ -> nvm use 22 && node scripts/update-pve-prices.mjs
 * ========================================================================= */
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public', 'pve_prices.json');
const URL_PVE = 'https://json.tarkov.dev/pve/items';
const MIN_ITEMS = 3000;   // กันข้อมูลพัง: ปกติมี 5,000+

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const fleaOf = (list) => {
  const hit = (list || []).find((e) => e.source === 'fleaMarket');
  return hit?.priceRUB ?? null;
};

async function main() {
  process.stdout.write('→ ดึงราคาโหมด PvE ... ');
  const raw = await fetchJson(URL_PVE);
  const items = raw?.data?.items;
  if (!items) throw new Error('รูปแบบข้อมูลไม่ตรงที่คาด');

  const prices = {};
  let withFlea = 0;
  for (const [id, it] of Object.entries(items)) {
    const sell = fleaOf(it.sellFor) ?? it.lastLowPrice ?? null;
    const buy = fleaOf(it.buyFor);
    if (sell == null && buy == null) continue;   // ไอเทมที่ตลาดไม่รับ ไม่ต้องเก็บ
    prices[id] = [sell, buy];
    withFlea += 1;
  }

  if (withFlea < MIN_ITEMS) {
    throw new Error(`ได้แค่ ${withFlea} ไอเทม (คาดว่า ≥ ${MIN_ITEMS}) — ไม่เขียนทับ`);
  }

  await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), prices }));
  console.log(`✓ ${withFlea} ไอเทม`);
}

main().catch((err) => {
  console.error('✗ update-pve-prices ล้มเหลว:', err.message);
  console.error('  โหมด PvE จะใช้ราคาของ PvP ไปก่อน (หน้าเว็บยังทำงานได้)');
  process.exit(1);
});
