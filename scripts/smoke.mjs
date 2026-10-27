/* smoke — เรนเดอร์ทุกหน้าด้วย react-dom/server เพื่อหาหน้าที่พังตอนเรนเดอร์
 *
 * `vite build` จับไม่ได้เพราะมันแค่ compile ผ่าน ไม่เคยเรียกคอมโพเนนต์จริง
 * หน้าที่ throw ตอน render (อ่าน property ของ undefined, hook พัง, ฯลฯ)
 * จะ build ผ่านฉลุยแล้วไปขาวตอนเปิดใช้งานจริง อันนี้เรียกจริงเลยเลยเจอ
 *
 *   npm run smoke
 *
 * ข้อจำกัดที่ต้องรู้: นี่คือ render รอบแรกรอบเดียวบน DOM ปลอม
 * ไม่ได้รัน useEffect ไม่ได้กดอะไร ไม่ได้เช็คหน้าตา — ผ่าน = "เปิดหน้าแล้วไม่ขาว" เท่านั้น
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// ต้องอยู่ใน node_modules ของโปรเจกต์ ไม่งั้น node resolve 'react' จากไฟล์ผลลัพธ์ไม่เจอ
const OUT = path.join(ROOT, 'node_modules/.cache/eft-smoke');

/* ทุก route ใน main.jsx — เพิ่มหน้าใหม่แล้วอย่าลืมมาต่อท้ายตรงนี้ */
const PAGES = [
  ['Home', 'src/home/home.jsx'],
  ['AddQuest', 'src/pages/AddQuest.jsx'],
  ['MapPage', 'src/pages/MapPage.jsx'],
  ['Kappa', 'src/pages/Kappa.jsx'],
  ['StoryProgress', 'src/pages/StoryProgress.jsx'],
  ['QuestTree', 'src/pages/QuestTree.jsx'],
  ['Hideout', 'src/pages/Hideout.jsx'],
  ['Balistic', 'src/pages/Balistic.jsx'],
  ['ItemPrice', 'src/pages/ItemPrice.jsx'],
  ['WeaponBuild', 'src/pages/WeaponBuild.jsx'],
  ['WeaponOptimizer', 'src/pages/WeaponOptimizer.jsx'],
  ['CaliberOptimizer', 'src/pages/CaliberOptimizer.jsx'],
  ['PriceList', 'src/pages/PriceList.jsx'],
  ['GearPreview', 'src/pages/GearPreview.jsx'],
];

/* ---- DOM ปลอมเท่าที่หน้าเหล่านี้แตะตอน render รอบแรก -------------------
 * ใส่เควสจริงลง localStorage ด้วย ไม่งั้น Home/MapPage เรนเดอร์หน้าเปล่า
 * แล้วโค้ดส่วนการ์ด/ตัวกรอง/กุญแจ ไม่เคยถูกเรียกเลย
 */
const tasks = JSON.parse(readFileSync(path.join(ROOT, 'src/data/tasks.json'), 'utf8'));
const allTasks = Array.isArray(tasks) ? tasks : tasks.tasks || tasks.data || [];
const seed = allTasks.filter((q) => ['Any', 'USEC'].includes(q.factionName)).slice(0, 8);

const mem = {
  eft_faction_name: '"USEC"',
  eft_selected_quests: JSON.stringify(seed),
};
globalThis.localStorage = {
  getItem: (k) => mem[k] ?? null,
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = {
  addEventListener() {}, removeEventListener() {},
  localStorage: globalThis.localStorage,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  scrollTo() {}, innerWidth: 1440, innerHeight: 900,
  location: { hash: '', href: 'http://localhost/' },
};
globalThis.document = {
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  createElement: () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} } }),
  documentElement: { style: { setProperty() {} } },
  body: { style: {}, appendChild() {}, removeChild() {} },
};
// lib อย่าง html2canvas อ่าน window.document / window.navigator ตอน import ไม่ใช่ตอนเรียกใช้
globalThis.window.document = globalThis.document;
globalThis.window.navigator = { userAgent: 'node' };

globalThis.requestAnimationFrame = (fn) => fn();
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
// node 22 ทำ navigator เป็น getter อย่างเดียว กำหนดทับตรง ๆ ไม่ได้
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'node' },
  configurable: true, writable: true,
});

/* ---- bundle ทีละหน้า --------------------------------------------------
 * outfile ไม่ใช่ outdir: entry อยู่นอก absWorkingDir แล้ว outdir จะสร้าง
 * โฟลเดอร์ซ้อนตาม path ทำให้หาไฟล์ผลลัพธ์ไม่เจอ
 * react ปล่อย external ไว้ ไม่งั้น react-dom/server พังที่ dynamic require("util")
 * tesseract.js (OCR ในหน้า AddQuest/ItemPrice) ก็เหมือนกัน — ให้ node โหลด CJS เอง
 */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* vite ตีความ import "/Top_R.png" เป็นไฟล์ใน public/ แต่ esbuild อ่านเป็น path ระบบ
   แล้วหาไม่เจอ — map กลับไป public/ ให้ตรงกับที่ vite ทำ */
const publicAssets = {
  name: 'public-assets',
  setup(b) {
    // เฉพาะไฟล์ asset ที่ import มา — ไม่ใช่ entry point ซึ่งเป็น absolute path เหมือนกัน
    b.onResolve({ filter: /^\/[^/].*\.(png|jpe?g|svg|webp|gif)$/ }, (a) => (
      a.kind === 'entry-point' ? null : { path: path.join(ROOT, 'public', a.path) }
    ));
  },
};

const results = {};
globalThis.__SMOKE__ = results;

for (let i = 0; i < PAGES.length; i++) {
  const [name, file] = PAGES[i];
  const entry = path.join(OUT, `entry-${i}.jsx`);
  writeFileSync(entry, `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Page from ${JSON.stringify(path.join(ROOT, file))};
// ห่อ Router เหมือน main.jsx ไม่งั้นหน้าที่ใช้ useNavigate จะ throw
const tree = React.createElement(MemoryRouter, null, React.createElement(Page));
try { globalThis.__SMOKE__[${JSON.stringify(name)}] = { ok: true, len: renderToString(tree).length }; }
catch (e) { globalThis.__SMOKE__[${JSON.stringify(name)}] = { ok: false, err: e.message }; }
`);
  try {
    await build({
      entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
      outfile: path.join(OUT, `page-${i}.mjs`), jsx: 'automatic',
      loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl', '.css': 'empty' },
      define: { 'import.meta.env.BASE_URL': '"/"' },
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server', 'tesseract.js'],
      absWorkingDir: ROOT, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error',
      plugins: [publicAssets],
    });
    await import(path.join(OUT, `page-${i}.mjs`));
  } catch (e) {
    results[name] = { ok: false, err: `bundle/import: ${e.message}` };
  }
}

let bad = 0;
for (const [name] of PAGES) {
  const r = results[name];
  if (!r) { console.log(`  ? ${name.padEnd(16)} ไม่ได้ผลลัพธ์`); bad++; }
  else if (r.ok) console.log(`  ✓ ${name.padEnd(16)} ${String(r.len).padStart(7)} ตัวอักษร`);
  else { console.log(`  ✗ ${name.padEnd(16)} ${r.err}`); bad++; }
}
console.log(bad ? `\n✗ เรนเดอร์ไม่ผ่าน ${bad}/${PAGES.length} หน้า` : `\n✓ ผ่านครบ ${PAGES.length} หน้า`);
process.exit(bad ? 1 : 0);
