/* =========================================================================
 * gameStore.js
 * โหลดข้อมูล "สด" จาก json.tarkov.dev ตอนเข้าเว็บ แล้ว transform ในเบราว์เซอร์
 * เก็บไว้ใน store กลาง (ตัวแปรเดียว) ให้ทุกหน้าใช้ร่วมกัน — สดเสมอ ไม่ต้องรอ rebuild
 *
 * fallback: ถ้าดึง/transform ไม่สำเร็จ หน้าเว็บจะใช้ไฟล์ static ที่ bundle ไว้แทน
 *   - หน้า import: ส่ง static เป็น fallback ผ่าน useLiveData(staticData, key)
 *   - หน้า fetch:  getData(key, publicJsonUrl) จะ fallback ไป fetch ไฟล์ public เดิม
 *
 * flow: main.jsx เรียก preloadAll() ครั้งเดียวตอนเข้าเว็บ -> fetch + transform +
 *       ใส่ store + แจ้ง subscribers -> useLiveData สลับจาก static เป็น live อัตโนมัติ
 * ========================================================================= */
import { useEffect, useState } from 'react';
import {
  transformItems, transformPriceData, transformGear, transformOptimizer,
  transformAmmo, transformMaps, transformHideout, transformTasks, transformLoot,
  applyPveFlea,
} from './transforms.js';
// รายชื่อเควส Kappa จากวิกิ (build-time, scripts/update-kappa.mjs)
// ต้องส่งเข้า transformTasks ตอน transform สด ไม่งั้นข้อมูลสดจะเหลือ kappaRequired แค่ 13 เควส
import kappaList from './kappa.json';
// เส้นเชื่อม/Loyalty Level ที่ json.tarkov.dev ไม่มี (build-time, scripts/update-quest-links.mjs)
import questLinks from './quest_links.json';

const BASE = 'https://json.tarkov.dev/regular';
const GRIDS_URL = 'https://tarkov.dev/data/item-grids.min.json';
// ราคาตลาดของโหมด PvE (scripts/update-pve-prices.mjs) — ราคาเทรดเดอร์เท่ากันทั้งสองโหมด
// เลยเก็บแค่ส่วนที่ต่าง 145 KB แทนการโคลน items ทั้งก้อน 5.3 MB
const PVE_PRICES_URL = `${import.meta.env.BASE_URL}pve_prices.json`;

const store = {};              // key -> live data (undefined = ยังไม่มี/ล้มเหลว)
/* โหมดเกมที่เลือกอยู่ (ปุ่มใน AppNavbar) — มีผลกับราคาตลาดเท่านั้น
   เก็บวัตถุดิบที่ใช้ derive ราคาไว้ เพื่อสร้างชุดใหม่ตอนสลับโหมดโดยไม่ต้องโหลดซ้ำ */
let gameMode = (() => {
  try { return JSON.parse(localStorage.getItem('eft_gameplay_mode')) || 'pve'; } catch { return 'pve'; }
})();
let pvePrices = null;          // { id: [sell, buy] }
const raw = {};                // เก็บ input ดิบไว้ rebuild ตอนสลับโหมด
const subscribers = {};        // key -> Set<setState>
let loadPromise = null;        // กัน preload ซ้ำ

// สถานะการซิงค์ข้อมูลสด: 'idle' | 'loading' | 'done' | 'offline'
let syncStatus = 'idle';
const statusSubs = new Set();
function setStatus(s) { syncStatus = s; statusSubs.forEach((cb) => cb(s)); }
export function getSyncStatus() { return syncStatus; }

// ใส่ราคาตลาดตามโหมดที่เลือก (PvP = ตามต้นทาง, PvE = ทับด้วย overlay)
function withMode(itemsBase) {
  return gameMode === 'pve' ? applyPveFlea(itemsBase, pvePrices) : itemsBase;
}

export function getGameMode() { return gameMode; }

/**
 * สลับโหมดเกม — สร้างชุดราคาใหม่จากวัตถุดิบที่โหลดไว้แล้ว ไม่ต้องยิงเน็ตซ้ำ
 * กระทบเฉพาะราคาตลาด (items / price / gear) ส่วนเควส แมพ ไฮด์เอาต์ เหมือนกันทั้งสองโหมด
 */
export function setGameMode(mode) {
  if (mode !== 'pve' && mode !== 'pvp') return;
  if (mode === gameMode) return;
  gameMode = mode;
  if (!raw.itemsBase) return;                 // ยังโหลดไม่เสร็จ เดี๋ยว doLoad จะใช้ค่าใหม่เอง
  const itemsArr = withMode(raw.itemsBase);
  set('items', itemsArr);
  if (raw.barters) safeSet('price', () => transformPriceData(itemsArr, raw.barters, raw.traders));
  if (raw.items) safeSet('gear', () => transformGear(itemsArr, raw.items, raw.grids || {}));
}

function notify(key) {
  (subscribers[key] || []).forEach((cb) => cb(store[key]));
}
function set(key, value) {
  store[key] = value;
  notify(key);
}
export function getLive(key) {
  return store[key];
}

async function fetchJson(url, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) {
        console.warn(`[gameStore] fetch ล้มเหลว ${url}: ${err.message}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return null;
}

// สร้าง derived dataset แบบ guard: ถ้า input ที่จำเป็นหาย -> ข้าม (คง static fallback)
function safeSet(key, fn) {
  try {
    const v = fn();
    if (v != null) set(key, v);
  } catch (err) {
    console.warn(`[gameStore] transform '${key}' ล้มเหลว: ${err.message}`);
  }
}

async function doLoad() {
  const [items, itemsEn, traders, barters, tasks, tasksEn, maps, mapsEn, hideout, hideoutEn, grids] =
    await Promise.all([
      fetchJson(`${BASE}/items`), fetchJson(`${BASE}/items_en`), fetchJson(`${BASE}/traders`),
      fetchJson(`${BASE}/barters`), fetchJson(`${BASE}/tasks`), fetchJson(`${BASE}/tasks_en`),
      fetchJson(`${BASE}/maps`), fetchJson(`${BASE}/maps_en`), fetchJson(`${BASE}/hideout`),
      fetchJson(`${BASE}/hideout_en`), fetchJson(GRIDS_URL),
    ]);

  // ราคาตลาด PvE มาจากไฟล์ของเราเอง ล้มเหลวก็แค่ใช้ราคา PvP ไปก่อน
  pvePrices = (await fetchJson(PVE_PRICES_URL))?.prices || null;

  // items เป็นฐานของ price/gear/optimizer/ammo — ถ้าไม่มีก็ทำอะไรต่อไม่ได้
  Object.assign(raw, { items, itemsEn, traders, barters, grids });
  let itemsArr = null;
  if (items && itemsEn && traders) {
    safeSet('items', () => {
      raw.itemsBase = transformItems(items, itemsEn, traders);   // ราคา PvP ตามต้นทาง
      itemsArr = withMode(raw.itemsBase);
      return itemsArr;
    });
  }
  if (itemsArr && barters) safeSet('price', () => transformPriceData(itemsArr, barters, traders));
  if (itemsArr && items) safeSet('gear', () => transformGear(itemsArr, items, grids || {}));
  if (items && itemsEn && traders) safeSet('optimizer', () => transformOptimizer(items, itemsEn, traders));
  if (items && itemsEn) safeSet('ammo', () => transformAmmo(items, itemsEn));
  if (maps && mapsEn && items && itemsEn) safeSet('maps', () => transformMaps(maps, mapsEn, items, itemsEn));
  if (maps) safeSet('loot', () => transformLoot(maps));
  if (hideout && hideoutEn && items && itemsEn) safeSet('hideout', () => transformHideout(hideout, hideoutEn, items, itemsEn));
  if (tasks && tasksEn && mapsEn && traders && items && itemsEn)
    safeSet('tasks', () => transformTasks(tasks, tasksEn, mapsEn, traders, items, itemsEn, kappaList?.questNames, questLinks?.quests, questLinks?.traderOrder));
}

// เรียกครั้งเดียวตอนเข้าเว็บ (idempotent)
export function preloadAll() {
  if (!loadPromise) {
    setStatus('loading');
    loadPromise = doLoad()
      .then(() => setStatus(store.items !== undefined ? 'done' : 'offline')) // items = ฐาน ถ้าไม่มา = ใช้ static
      .catch((e) => { console.warn('[gameStore] preload error', e); setStatus('offline'); });
  }
  return loadPromise;
}

// hook ให้ UI ติดตามสถานะการซิงค์
export function useSyncStatus() {
  const [s, setS] = useState(syncStatus);
  useEffect(() => {
    setS(syncStatus);
    statusSubs.add(setS);
    return () => statusSubs.delete(setS);
  }, []);
  return s;
}

/* ---- สำหรับหน้าที่เดิมใช้ fetch(publicUrl) ------------------------------- *
 * คืน live ถ้าโหลดเสร็จ; ระหว่างรอ preload ก็รอ; ถ้า live ไม่มา -> fetch ไฟล์ public เดิม
 * ------------------------------------------------------------------------- */
export async function getData(key, fallbackUrl) {
  if (store[key] !== undefined) return store[key];
  await preloadAll();
  if (store[key] !== undefined) return store[key];
  if (fallbackUrl) {
    const res = await fetch(fallbackUrl);
    if (res.ok) return res.json();
  }
  return null;
}

/* ---- React hook สำหรับหน้าที่เดิมใช้ static import ------------------------ *
 * คืน static ทันที (เรนเดอร์เร็ว ไม่ว่าง) แล้วสลับเป็น live เมื่อโหลดเสร็จ
 * ------------------------------------------------------------------------- */
export function useLiveData(fallback, key) {
  const [live, setLive] = useState(() => getLive(key));
  useEffect(() => {
    setLive(getLive(key)); // เผื่อโหลดเสร็จก่อน mount
    const set = (subscribers[key] = subscribers[key] || new Set());
    const cb = (v) => setLive(v);
    set.add(cb);
    preloadAll();
    return () => set.delete(cb);
  }, [key]);
  return live !== undefined ? live : fallback;
}
