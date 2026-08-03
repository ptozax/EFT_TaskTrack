#!/usr/bin/env node
/* =========================================================================
 * update-price-data.mjs
 * สร้าง public/price_data.json จาก src/data/items.json (offline — ไม่ยิง API)
 * items.json มี buyFor/sellFor/lastLowPrice อยู่แล้ว (อัปเดตโดย update-data.mjs)
 * จึงแค่ดึงเฉพาะที่ต้องใช้มาทำลิสต์ให้ไฟล์เล็ก + หน้า PriceList โหลดไว
 *
 * รูปแบบผลลัพธ์:
 *   { updated, items: [ {
 *       id, name, shortName, icon,
 *       buy:  { source, price, currency, priceRUB } | null,  // แหล่งซื้อถูกสุด
 *       sell: { source, price, currency, priceRUB } | null,  // ขายพ่อค้าได้ดีสุด
 *       flea: number | null                                   // Flea (lastLowPrice)
 *   } ] }
 *
 * วิธีใช้:  node scripts/update-price-data.mjs   (หรือ npm run update-price)
 *          ราคาจะ fresh ตาม items.json ล่าสุด — รัน npm run update-data ก่อนถ้าอยากอัปเดตราคา
 * ========================================================================= */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src', 'data', 'items.json');
const OUT = resolve(ROOT, 'public', 'price_data.json');
// flat file (แหล่งเดียวกับเว็บ tarkov.dev) — ใช้แทน GraphQL ที่ล่มอยู่
const BARTERS_URL = 'https://json.tarkov.dev/regular/barters';
const TRADERS_URL = 'https://json.tarkov.dev/regular/traders';

// currency item ids — ใช้แยก "cash purchase" ออกจาก barter จริง
const CURRENCY_IDS = new Set([
  '5449016a4bdc2d6f028b456f', // RUB
  '5696686a4bdc2da3298b456a', // USD
  '569668774bdc2da2298b4568', // EUR
]);

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! fetch ${url} attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

// ดึง barter จาก flat file — best-effort: ถ้าดึงไม่ได้จะข้าม (ราคายังทำ offline ได้)
// คืน map: rewardItemId -> [ { trader, level, requiredItems:[{id,shortName,count,icon}] } ]
async function fetchBarterMap(meta) {
  const [bJson, tJson] = await Promise.all([fetchJson(BARTERS_URL), fetchJson(TRADERS_URL)]);
  if (!bJson) return null;

  // trader id -> normalizedName
  const traderName = {};
  const traders = tJson ? Object.values(tJson.data.traders || tJson.data) : [];
  traders.forEach((t) => { if (t?.id) traderName[t.id] = t.normalizedName; });

  const barters = Object.values(bJson.data.barters || bJson.data);
  const map = {};
  for (const b of barters) {
    const req = (b.requiredItems || []).filter((r) => r.item);
    // ข้าม cash purchase (required เป็นเงินล้วน)
    if (!req.length || req.every((r) => CURRENCY_IDS.has(r.item))) continue;

    const entry = {
      trader: traderName[b.trader] || b.trader,
      level: b.minTraderLevel ?? null,
      requiredItems: req
        .filter((r) => !CURRENCY_IDS.has(r.item))
        .map((r) => {
          const m = meta.get(r.item) || {};
          return { id: r.item, shortName: m.shortName || null, count: r.count, icon: m.gridImageLink || m.inspectImageLink || null };
        }),
    };
    const rewardId = b.offeredItem?.item;
    if (!rewardId) continue;
    (map[rewardId] = map[rewardId] || []).push(entry);
  }
  return map;
}

// ราคาซื้อจากพ่อค้า "ทุกคน" (ไม่นับ fleaMarket) เรียงถูก -> แพง เพื่อกรองรายพ่อค้าได้
// level = loyalty level ที่ต้องปลดล็อก (minTraderLevel) — อาจเป็น null ถ้าข้อมูลไม่มี
const traderBuys = (buyFor) =>
  (buyFor || [])
    .filter((b) => b && b.source !== 'fleaMarket' && b.priceRUB > 0)
    .map((b) => ({ source: b.source, price: b.price, currency: b.currency, priceRUB: b.priceRUB, level: b.vendor?.minTraderLevel ?? null, buyLimit: b.vendor?.buyLimit ?? null }))
    .sort((a, b) => a.priceRUB - b.priceRUB);

// ซื้อจาก Flea (fleaMarket ใน buyFor)
const fleaBuy = (buyFor) => {
  const f = (buyFor || []).find((b) => b && b.source === 'fleaMarket' && b.priceRUB > 0);
  return f ? { price: f.price, currency: f.currency, priceRUB: f.priceRUB } : null;
};

// ขายพ่อค้าได้ดีสุด (ไม่นับ fleaMarket, priceRUB สูงสุด)
const bestTraderSell = (sellFor) => {
  const offers = (sellFor || []).filter((s) => s && s.source !== 'fleaMarket' && s.priceRUB > 0);
  if (!offers.length) return null;
  const s = offers.reduce((max, o) => (o.priceRUB > max.priceRUB ? o : max));
  return { source: s.source, price: s.price, currency: s.currency, priceRUB: s.priceRUB };
};

async function main() {
  console.log('→ อ่าน src/data/items.json ...');
  const raw = await readFile(SRC, 'utf8');
  const src = JSON.parse(raw);
  const meta = new Map(src.map((it) => [it.id, it])); // id -> ชื่อ/ไอคอน

  console.log('→ ดึง barter จาก json.tarkov.dev (flat file) ...');
  const barterMap = await fetchBarterMap(meta);
  if (barterMap) console.log(`  ✓ barters: ${Object.keys(barterMap).length} reward items`);
  else console.log('  ! ดึง barter ไม่ได้ — ทำต่อโดยไม่มี barter');

  const items = src
    .map((it) => {
      const buys = traderBuys(it.buyFor);
      const buyFlea = fleaBuy(it.buyFor);
      const sell = bestTraderSell(it.sellFor);
      const fleaSell = (it.sellFor || []).find((s) => s.source === 'fleaMarket');
      const flea = it.lastLowPrice || fleaSell?.priceRUB || null;
      const barters = barterMap?.[it.id] || [];
      return {
        id: it.id,
        name: it.name,
        shortName: it.shortName,
        icon: it.gridImageLink || it.inspectImageLink || it.baseImageLink || null,
        buys,     // ราคาซื้อจากพ่อค้าทุกคน (เรียงถูก->แพง)
        buyFlea,  // ซื้อจาก Flea (fallback / ตัวเลือก)
        barters,  // ของที่ต้องเอาของแลก [{trader, level, requiredItems}]
        sell,     // ขายพ่อค้าได้ดีสุด (ข้อมูลเสริม)
        flea,     // ราคา Flea (ขาย/อ้างอิง)
      };
    })
    // เก็บเฉพาะไอเทมที่ได้มา (ซื้อพ่อค้า / Flea / barter)
    .filter((it) => it.buys.length || it.buyFlea || it.barters.length)
    .sort((a, b) => a.name.localeCompare(b.name));

  // updated = วันที่ของ items.json จริง (สะท้อนความสดของ "ราคา" ไม่ใช่เวลาที่ derive)
  const srcStat = await stat(SRC);
  const out = { updated: srcStat.mtime.toISOString(), items };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));

  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  items: ${items.length} / ${src.length}`);
}

main().catch((err) => {
  console.error('✗ ล้มเหลว:', err);
  process.exit(1);
});
