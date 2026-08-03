#!/usr/bin/env node
/* =========================================================================
 * update-items.mjs
 * สร้าง src/data/items.json จาก json.tarkov.dev (flat file — สดกว่า/ไม่พึ่ง GraphQL)
 * ประกอบ buyFor/sellFor กลับจาก buyFromTrader/sellToTrader (มี LL + buyLimit จริง)
 * ชื่อ resolve จาก items_en · trader id -> normalizedName จาก regular/traders
 *
 * shape ตรงกับที่ ItemPrice.jsx + update-price-data.mjs ใช้:
 *   { id, name, shortName, normalizedName, basePrice, height, width,
 *     baseImageLink, gridImageLink, wikiLink, inspectImageLink, lastLowPrice,
 *     sellFor:[{source,price,currency,priceRUB}],
 *     buyFor: [{source,price,currency,priceRUB, vendor?:{minTraderLevel,buyLimit}}] }
 *
 * วิธีใช้:  node scripts/update-items.mjs   (npm run update-items)
 * ========================================================================= */

import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const [itemsJson, enJson, tradersJson] = await Promise.all([
    fetchJson(`${BASE}/items`),
    fetchJson(`${BASE}/items_en`),
    fetchJson(`${BASE}/traders`),
  ]);

  const items = itemsJson.data.items;               // { id: item }
  const tr = enJson.data;                            // { "<key>": "English" }
  const name = (key) => tr[key] ?? key;
  const traderName = {};
  Object.values(tradersJson.data.traders || tradersJson.data).forEach((t) => {
    if (t?.id) traderName[t.id] = t.normalizedName;
  });

  const out = Object.values(items).map((it) => {
    const buyFor = [
      ...(it.buyFromTrader || []).map((o) => ({
        source: traderName[o.trader] || o.trader,
        price: o.price, currency: o.currency, priceRUB: o.priceRUB,
        vendor: { minTraderLevel: o.minTraderLevel ?? null, buyLimit: o.buyLimit ?? null },
      })),
    ];
    // ซื้อจาก Flea (ถ้าเทรดใน flea ได้) — ใช้ avg24hPrice เป็นราคาประมาณ
    if (it.avg24hPrice) buyFor.push({ source: 'fleaMarket', price: it.avg24hPrice, currency: 'RUB', priceRUB: it.avg24hPrice });

    const sellFor = [
      ...(it.sellToTrader || []).map((o) => ({
        source: traderName[o.trader] || o.trader,
        price: o.price, currency: o.currency, priceRUB: o.priceRUB,
      })),
    ];
    if (it.lastLowPrice) sellFor.push({ source: 'fleaMarket', price: it.lastLowPrice, currency: 'RUB', priceRUB: it.lastLowPrice });

    return {
      id: it.id,
      name: name(it.name),
      shortName: name(it.shortName),
      normalizedName: it.normalizedName,
      basePrice: it.basePrice,
      height: it.height,
      width: it.width,
      baseImageLink: it.baseImageLink,
      gridImageLink: it.gridImageLink,
      wikiLink: it.wikiLink,
      inspectImageLink: it.inspectImageLink,
      lastLowPrice: it.lastLowPrice ?? null,
      sellFor,
      buyFor,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  await writeFile(OUT, JSON.stringify(out));
  console.log(`✓ เขียน ${OUT}`);
  console.log(`  items: ${out.length}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
