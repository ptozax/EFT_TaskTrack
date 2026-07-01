#!/usr/bin/env node
/* =========================================================================
 * update-optimizer-data.mjs
 * ดึงข้อมูลปืน + มอด จาก tarkov.dev GraphQL แล้วเขียนลง public/optimizer_data.json
 * ให้ตรงกับ shape ที่ src/pages/WeaponOptimizer.jsx ใช้งาน
 *
 * รูปแบบผลลัพธ์:
 *   {
 *     guns: [ { id, name, shortName, caliber, icon, ergo, recoilV, recoilH, weight, price,
 *               slots:[{ name, nameId, required, allowed:[modId,...] }] } ],
 *     mods: { [id]: { id, name, shortName, types, icon, ergo, recoil, acc, weight,
 *                     capacity, price, conflicts:[id,...], slots:[...] } }
 *   }
 *
 * วิธีใช้:  node scripts/update-optimizer-data.mjs
 * ========================================================================= */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.tarkov.dev/graphql';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'optimizer_data.json');

// slots ใช้ร่วมกันได้ระหว่าง gun / mod — allowed = list ของ item id ที่ใส่ได้
const SLOT_FRAGMENT = `
  slots {
    name
    nameId
    required
    filters { allowedItems { id } }
  }`;

const QUERY = `
query OptimizerData {
  guns: items(types: gun) {
    id
    name
    shortName
    weight
    iconLink
    buyFor { priceRUB }
    properties {
      __typename
      ... on ItemPropertiesWeapon {
        caliber
        ergonomics
        recoilVertical
        recoilHorizontal
        ${SLOT_FRAGMENT}
      }
    }
  }
  mods: items(types: mods) {
    id
    name
    shortName
    types
    weight
    iconLink
    buyFor { priceRUB }
    conflictingItems { id }
    properties {
      __typename
      ... on ItemPropertiesWeaponMod { ergonomics recoilModifier accuracyModifier ${SLOT_FRAGMENT} }
      ... on ItemPropertiesMagazine   { ergonomics recoilModifier capacity ${SLOT_FRAGMENT} }
      ... on ItemPropertiesScope       { ergonomics recoilModifier ${SLOT_FRAGMENT} }
      ... on ItemPropertiesBarrel      { ergonomics recoilModifier ${SLOT_FRAGMENT} }
    }
  }
}`;

// typenames ที่ถือเป็น "มอด" ที่ optimizer ใช้ได้ (ตัด NightVision / null ทิ้ง)
const MOD_TYPENAMES = new Set([
  'ItemPropertiesWeaponMod',
  'ItemPropertiesMagazine',
  'ItemPropertiesScope',
  'ItemPropertiesBarrel',
]);

async function fetchData(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: QUERY }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
      return json.data;
    } catch (err) {
      console.warn(`  ! attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// ราคาที่ถูกที่สุดที่ "ซื้อได้" (RUB) — null ถ้าซื้อไม่ได้เลย (เช่นของ noFlea + ไม่มี trader)
const buyPrice = (buyFor) => {
  const prices = (buyFor || []).map((b) => b.priceRUB).filter((p) => p != null && p > 0);
  return prices.length ? Math.min(...prices) : null;
};

// recoilModifier จาก API เป็นสัดส่วน (-0.26) -> เก็บเป็นเปอร์เซ็นต์ (-26) ทศนิยม 2 ตำแหน่ง
const toPct = (v) => (v ? Math.round(v * 10000) / 100 : 0);

const mapSlots = (slots) =>
  (slots || []).map((s) => ({
    name: s.name,
    nameId: s.nameId,
    required: !!s.required,
    allowed: (s.filters?.allowedItems || []).map((a) => a.id),
  }));

async function main() {
  console.log('→ ดึงข้อมูลจาก tarkov.dev ...');
  const data = await fetchData();

  const guns = data.guns
    .filter((g) => g.properties?.__typename === 'ItemPropertiesWeapon')
    .map((g) => {
      const p = g.properties;
      return {
        id: g.id,
        name: g.name,
        shortName: g.shortName,
        caliber: p.caliber ? p.caliber.replace(/^Caliber/, '') : null,
        icon: g.iconLink || null,
        ergo: p.ergonomics ?? 0,
        recoilV: p.recoilVertical ?? 0,
        recoilH: p.recoilHorizontal ?? 0,
        weight: g.weight ?? 0,
        price: buyPrice(g.buyFor),
        slots: mapSlots(p.slots),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const mods = {};
  for (const m of data.mods) {
    const p = m.properties;
    if (!p || !MOD_TYPENAMES.has(p.__typename)) continue;
    mods[m.id] = {
      id: m.id,
      name: m.name,
      shortName: m.shortName,
      types: m.types || [],
      icon: m.iconLink || null,
      ergo: p.ergonomics ?? 0,
      recoil: toPct(p.recoilModifier),
      acc: p.accuracyModifier ?? 0,
      weight: m.weight ?? 0,
      capacity: p.capacity ?? null,
      price: buyPrice(m.buyFor),
      conflicts: (m.conflictingItems || []).map((c) => c.id),
      slots: mapSlots(p.slots),
    };
  }

  const out = { guns, mods };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));

  console.log(`✓ เขียนไฟล์ ${OUT}`);
  console.log(`  guns: ${guns.length}  |  mods: ${Object.keys(mods).length}`);
}

main().catch((err) => {
  console.error('✗ ล้มเหลว:', err);
  process.exit(1);
});
