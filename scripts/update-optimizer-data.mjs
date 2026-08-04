#!/usr/bin/env node
/* =========================================================================
 * update-optimizer-data.mjs
 * ดึงข้อมูลปืน + มอด จาก json.tarkov.dev (flat file — สดกว่า/ไม่พึ่ง GraphQL)
 * แล้วเขียนลง public/optimizer_data.json ให้ตรง shape ที่ WeaponOptimizer /
 * WeaponBuild / CaliberOptimizer ใช้งาน
 *
 * รูปแบบผลลัพธ์:
 *   {
 *     guns: [ { id, name, shortName, caliber, icon, image, ergo, recoilV, recoilH,
 *               fireRate, moa, weight, price, buyFor:[...], slots:[{id,name,nameId,required,allowed:[modId,...]}] } ],
 *     mods: { [id]: { id, name, shortName, types, icon, ergo, recoil, acc, moa, weight,
 *                     capacity, price, buyFor:[...], conflicts:[id,...], slots:[...] } }
 *   }
 *
 * ต้องใช้ Node 18+ (global fetch)  ->  nvm use 22 && node scripts/update-optimizer-data.mjs
 * ========================================================================= */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://json.tarkov.dev/regular';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'optimizer_data.json');

// propertiesType ที่ถือเป็น "มอด" ที่ optimizer ใช้ได้
const MOD_PTYPES = new Set([
  'ItemPropertiesWeaponMod',
  'ItemPropertiesMagazine',
  'ItemPropertiesScope',
  'ItemPropertiesBarrel',
]);

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

// ราคาที่ถูกที่สุดที่ "ซื้อได้" (RUB) — null ถ้าซื้อไม่ได้เลย
const buyPrice = (buyFor) => {
  const prices = (buyFor || []).map((b) => b.priceRUB).filter((p) => p != null && p > 0);
  return prices.length ? Math.min(...prices) : null;
};

// recoilModifier เป็นสัดส่วน (-0.26) -> เก็บเป็นเปอร์เซ็นต์ (-26) ทศนิยม 2 ตำแหน่ง
const toPct = (v) => (v ? Math.round(v * 10000) / 100 : 0);

// slot.name ใน flat เป็นตัวพิมพ์ใหญ่ (MOD_PISTOL_GRIP) — ทำเป็นชื่ออ่านง่ายจาก nameId
const prettySlot = (nameId, fallback) => {
  if (!nameId) return fallback || '';
  return nameId
    .replace(/^mod_/, '')
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const mapSlots = (slots) =>
  (slots || []).map((s) => ({
    id: s.id,
    name: prettySlot(s.nameId, s.name),
    nameId: s.nameId,
    required: !!s.required,
    allowed: s.filters?.allowedItems || [], // flat = array ของ id string อยู่แล้ว
  }));

async function main() {
  console.log('→ ดึง items / items_en / traders จาก flat file ...');
  const [itemsJson, enJson, tradersJson] = await Promise.all([
    fetchJson(`${BASE}/items`),
    fetchJson(`${BASE}/items_en`),
    fetchJson(`${BASE}/traders`),
  ]);

  const items = itemsJson.data.items; // { id: item }
  const tr = enJson.data; // { "<key>": "English" }
  const name = (key) => tr[key] ?? key;

  // t.name ใน flat เป็น translation key -> ใช้ normalizedName แล้ว title-case (mechanic -> Mechanic)
  const titleCase = (s) =>
    (s || '').split(/[-\s]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  const traderName = {};
  Object.values(tradersJson.data.traders || tradersJson.data).forEach((t) => {
    if (t?.id) traderName[t.id] = titleCase(t.normalizedName) || t.id;
  });

  // buyFor: ประกอบจาก buyFromTrader (+ flea ถ้าเทรดใน flea ได้) — shape เดิมของ WeaponBuild
  const mapBuyFor = (it) => {
    const out = (it.buyFromTrader || [])
      .filter((o) => o && o.priceRUB != null)
      .map((o) => ({
        price: o.price,
        currency: o.currency,
        priceRUB: o.priceRUB,
        vendor: { name: traderName[o.trader] || o.trader },
      }));
    const noFlea = (it.types || []).includes('noFlea');
    if (!noFlea && it.avg24hPrice > 0) {
      out.push({ price: it.avg24hPrice, currency: 'RUB', priceRUB: it.avg24hPrice, vendor: { name: 'Flea Market' } });
    }
    return out;
  };

  const guns = Object.values(items)
    .filter((g) => g.properties?.propertiesType === 'ItemPropertiesWeapon')
    .map((g) => {
      const p = g.properties;
      const preset = p.defaultPreset ? items[p.defaultPreset] : null;
      const buyFor = mapBuyFor(g);
      return {
        id: g.id,
        name: name(g.name),
        shortName: name(g.shortName),
        caliber: p.caliber ? p.caliber.replace(/^Caliber/, '') : null,
        icon: g.iconLink || null,
        // hi-res assembled "standard build" image (default preset) พร้อม fallback
        image: preset?.image512pxLink || g.image512pxLink || g.iconLink || null,
        ergo: p.ergonomics ?? 0,
        recoilV: p.recoilVertical ?? 0,
        recoilH: p.recoilHorizontal ?? 0,
        fireRate: p.fireRate ?? 0,
        moa: p.centerOfImpact ?? null,
        weight: g.weight ?? 0,
        price: buyPrice(buyFor),
        buyFor,
        slots: mapSlots(p.slots),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const mods = {};
  for (const m of Object.values(items)) {
    const p = m.properties;
    if (!p || !MOD_PTYPES.has(p.propertiesType)) continue;
    const buyFor = mapBuyFor(m);
    mods[m.id] = {
      id: m.id,
      name: name(m.name),
      shortName: name(m.shortName),
      types: m.types || [],
      icon: m.iconLink || null,
      ergo: p.ergonomics ?? 0,
      recoil: toPct(p.recoilModifier),
      acc: p.accuracyModifier ?? 0,
      moa: p.centerOfImpact ?? null, // barrel เท่านั้นที่มี — ใช้แทนค่า base MOA เมื่อติดตั้ง
      weight: m.weight ?? 0,
      capacity: p.capacity ?? null,
      price: buyPrice(buyFor),
      buyFor,
      conflicts: m.conflictingItems || [], // flat = array ของ id string อยู่แล้ว
      slots: mapSlots(p.slots),
    };
  }

  const out = { guns, mods };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));

  const barrels = Object.values(mods).filter((m) => m.moa != null).length;
  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  guns: ${guns.length}  |  mods: ${Object.keys(mods).length}  |  barrels(moa): ${barrels}`);
}

main().catch((err) => {
  console.error('✗ ล้มเหลว:', err);
  process.exit(1);
});
