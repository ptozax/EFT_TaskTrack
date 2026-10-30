/* checks — ตรวจพฤติกรรมของหน้า ไม่ใช่แค่ "เรนเดอร์แล้วไม่พัง" แบบ smoke
 *
 *   npm run check
 *
 * smoke ตอบได้แค่ว่าหน้าไม่ขาว ส่วนไฟล์นี้ถามต่อว่า "แล้วมันแสดงถูกไหม" —
 * เรนเดอร์ด้วยสถานะที่จัดฉากไว้ (เควสที่ทำเสร็จ, LL ที่ตั้งไว้) แล้วอ่าน HTML
 * ที่ออกมาเทียบกับสิ่งที่ควรเห็น บวกกับเช็คตรรกะที่เรียกฟังก์ชันตรง ๆ ได้
 *
 * ข้อจำกัดเดียวกับ smoke: render รอบแรกรอบเดียวบน DOM ปลอม ไม่มี useEffect
 * ไม่ได้กดอะไร และไม่ได้เห็นหน้าตาจริง — เช็คหน้าตาได้แค่ผ่านค่าใน style
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'node_modules/.cache/eft-checks');

const tasks = JSON.parse(readFileSync(path.join(ROOT, 'src/data/tasks.json'), 'utf8'));
const TASKS = Array.isArray(tasks) ? tasks : tasks.tasks || tasks.data || [];

/* ---- DOM ปลอม (ชุดเดียวกับ smoke.mjs) --------------------------------- */
const mem = {};
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
globalThis.window.document = globalThis.document;
globalThis.window.navigator = { userAgent: 'node' };
globalThis.requestAnimationFrame = (fn) => fn();
globalThis.cancelAnimationFrame = () => {};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() }, userAgent: 'node' },
  configurable: true, writable: true,
});

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const publicAssets = {
  name: 'public-assets',
  setup(b) {
    b.onResolve({ filter: /^\/[^/].*\.(png|jpe?g|svg|webp|gif)$/ }, (a) => (
      a.kind === 'entry-point' ? null : { path: path.join(ROOT, 'public', a.path) }
    ));
  },
};

const entry = path.join(OUT, 'entry.jsx');
writeFileSync(entry, `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Home from ${JSON.stringify(path.join(ROOT, 'src/home/home.jsx'))};
import AddQuest from ${JSON.stringify(path.join(ROOT, 'src/pages/AddQuest.jsx'))};
export * as QC from ${JSON.stringify(path.join(ROOT, 'src/Component/QuestComponent.jsx'))};
const wrap = (C) => renderToString(React.createElement(MemoryRouter, null, React.createElement(C)));
export const renderHome = () => wrap(Home);
export const renderAddQuest = () => wrap(AddQuest);
`);
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
  outfile: path.join(OUT, 'app.mjs'), jsx: 'automatic',
  loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.webp': 'dataurl', '.css': 'empty' },
  define: { 'import.meta.env.BASE_URL': '"/"' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server', 'tesseract.js'],
  absWorkingDir: ROOT, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error',
  plugins: [publicAssets],
});
const { QC, renderHome, renderAddQuest } = await import(path.join(OUT, 'app.mjs'));

let bad = 0;
const ok = (cond, name) => { console.log(`  ${cond ? '✓' : '✗'} ${name}`); if (!cond) bad++; };
const group = (t) => console.log(`\n— ${t}`);

/* เซ็ตสถานะเริ่มต้น: เควสจริงของหลายเทรดเดอร์ + LL ที่ตั้งไว้ */
const pick = (trader) => TASKS.find((q) => q.trader?.name === trader && ['Any', undefined].includes(q.factionName));
const SEED_TRADERS = ['Prapor', 'Therapist', 'Skier', 'Peacekeeper'];
const resetState = (extra = {}) => {
  Object.keys(mem).forEach((k) => delete mem[k]);
  mem.eft_faction_name = '"USEC"';
  mem.eft_selected_quests = JSON.stringify(SEED_TRADERS.map(pick).filter(Boolean));
  mem.eft_trader_levels = JSON.stringify({ Prapor: 4, Therapist: 2, Skier: 1 });  // Peacekeeper ไม่ตั้ง -> ต้องได้ 1
  Object.assign(mem, extra);
};

/* ชิปเทรดเดอร์หนึ่งอัน: ตัดจาก title ของมันไปจนถึง title ของชิปถัดไป */
const chipBlocks = (html) => {
  const out = {};
  const re = /title="([^"]+) — Loyalty Level (\d)( \(max\))?"([\s\S]*?)(?=title="[^"]+ — Loyalty Level |$)/g;
  let m;
  while ((m = re.exec(html))) out[m[1]] = { level: Number(m[2]), max: !!m[3], body: m[4] };
  return out;
};
const levelButtons = (block) => (block?.body || '').match(/title="Loyalty Level (\d)/g) || [];

/* ================= ป้าย LL บนชิปเทรดเดอร์ ================= */
for (const [page, render] of [['Home', renderHome], ['AddQuest', renderAddQuest]]) {
  group(`ป้าย Loyalty บนชิปเทรดเดอร์ — ${page}`);
  resetState();
  const c = chipBlocks(render());
  ok(SEED_TRADERS.every((t) => c[t]), `มีชิปครบทุกเทรดเดอร์ในรายการ (ได้ ${Object.keys(c).join(', ') || 'ไม่มีเลย'})`);
  ok(c.Prapor?.level === 4 && c.Prapor.max, 'Prapor อ่าน LL4 จาก localStorage');
  ok(/<svg/.test(c.Prapor?.body || '') && !/>4</.test(c.Prapor?.body || ''), 'LL สูงสุดเป็นมงกุฎ ไม่ใช่เลข');
  // tabular-nums เป็น style ตัวสุดท้ายของป้าย LL ใช้เป็นหมุดชี้ว่าอะไรอยู่ในป้าย
  const mark = (t) => c[t]?.body.match(/tabular-nums">(.)/)?.[1];
  ok(c.Therapist?.level === 2 && mark('Therapist') === '2', `LL2 เป็นเลข 2 ไม่ใช่มงกุฎ (ได้ ${JSON.stringify(mark('Therapist'))})`);
  ok(mark('Prapor') === '<', 'LL สูงสุดใส่ svg ไว้ในป้าย ไม่ใช่ตัวอักษร');
  ok(c.Peacekeeper?.level === 1, 'เทรดเดอร์ที่ไม่เคยตั้งค่า ตกเป็น 1 ไม่ใช่ว่าง');
}

/* ================= โหมด Loyalty ================= */
group('โหมด Loyalty — เปิดอยู่');
resetState({ eft_home_drawer: 'true' });
const on = renderHome();
const onChips = chipBlocks(on);
ok(/title="Loyalty Level \d/.test(on), 'ปุ่มตั้งระดับอยู่ในหน้า ไม่ได้อยู่ในแผงข้าง');
ok(!/eft-drawer-backdrop|has-drawer|var\(--drawer\)/.test(on), 'ไม่เหลือร่องรอยแผงข้างเดิม');
// style แบบ inline กับ svg ของมงกุฎรวมกันยาวเกิน 500 ตัวอักษร เลยต้องเผื่อถึง 1200
const btnMax = on.match(/title="Loyalty Level 4 \(max\)"[\s\S]{0,1200}?<\/button>/)?.[0] || '';
ok(/<svg/.test(btnMax) && !/>4</.test(btnMax), 'ปุ่มระดับสูงสุดเป็นมงกุฎ');
ok(/title="Loyalty Level 3"/.test(on), 'ปุ่มระดับกลางยังเป็นเลข');

/* จำนวนปุ่มต้องเท่าระดับที่เทรดเดอร์คนนั้นมีจริงในเกม (ดู TRADER_LOYALTY_CAP) */
ok(levelButtons(onChips.Prapor).length === 4, `Prapor มี 4 ปุ่ม (ได้ ${levelButtons(onChips.Prapor).length})`);
ok(levelButtons(onChips.Fence).length === 2, `Fence มี 2 ปุ่มตามเกมจริง (ได้ ${levelButtons(onChips.Fence).length})`);
ok(levelButtons(onChips.Lightkeeper).length === 0, 'Lightkeeper ไม่มีปุ่ม มีระดับเดียว');
ok(levelButtons(onChips['Btr Driver']).length === 0, 'Btr Driver ไม่มีปุ่ม');
ok(onChips.Ragman !== undefined, 'โชว์เทรดเดอร์ที่ยังไม่มีเควสในรายการด้วย (ตั้ง LL ให้คนใหม่ได้)');
ok(/background:#ffeb3b/.test(onChips['Btr Driver']?.body || ''), 'Btr Driver ได้สีประจำตัว ไม่ตกไปใช้สีเริ่มต้น');

group('โหมด Loyalty — ค่าเก่าที่เกินเพดาน');
resetState({ eft_home_drawer: 'true', eft_trader_levels: JSON.stringify({ Fence: 4 }) });
ok(/title="Fence — Loyalty Level 2 \(max\)"/.test(renderHome()),
  'Fence ที่เคยตั้งไว้ 4 ตอนปุ่มยังเป็น 1-4 ทุกคน ถูกบีบเหลือ 2');

group('โหมด Loyalty — ปิดอยู่');
resetState({ eft_home_drawer: 'false' });
const off = renderHome();
const offChips = chipBlocks(off);
ok(!/title="Loyalty Level \d/.test(off), 'ไม่มีปุ่มตั้งระดับโผล่มา');
ok(/title="Prapor — Loyalty Level 4 \(max\)"/.test(off), 'ป้าย LL บนชิปยังอยู่');

/* สลับโหมดแล้วชิปต้องไม่ขยับ: รายชื่อเท่าเดิม เรียงเหมือนเดิม
   และคอลัมน์จองความกว้างของแถวปุ่มไว้ตั้งแต่ตอนปิด (4 ปุ่ม = 4*24 + 3*3 = 105) */
group('สลับโหมดแล้วชิปต้องอยู่กับที่');
ok(Object.keys(offChips).join() === Object.keys(onChips).join(),
  `รายชื่อและลำดับเหมือนกันทั้งสองโหมด (${Object.keys(offChips).length} คน)`);
ok(Object.keys(offChips).length === 11, `โชว์ครบทุกเทรดเดอร์ตลอด (ได้ ${Object.keys(offChips).length})`);
ok(/Ragman — Loyalty Level/.test(off), 'เทรดเดอร์ที่ไม่มีเควสในรายการก็ยังโชว์ตอนปิดโหมด');
/* นับทั้งหน้าแทนการไล่ดูทีละชิป — จับคู่ min-width กับเจ้าของให้ถูกตัวทำได้ยาก
   เพราะป้าย LL ข้างในชิปก็มี min-width:20px ของมันเอง
   สิ่งที่ต้องจริงคือ "จำนวนที่จองไว้ ต้องเท่ากันทั้งสองโหมด" ซึ่งนับเอาก็พอ */
const countOf = (html, w) => (html.match(new RegExp(`min-width:${w}px`, 'g')) || []).length;
const FOUR_LEVEL = 8;   // ทุกคนยกเว้น Fence (2), Lightkeeper, Btr Driver (ไม่มีปุ่ม)
ok(countOf(off, 105) === FOUR_LEVEL && countOf(on, 105) === FOUR_LEVEL,
  `คนที่มี 4 ระดับ จอง 105px ไว้เท่ากันทั้งสองโหมด (ปิด ${countOf(off, 105)} / เปิด ${countOf(on, 105)} / ควรได้ ${FOUR_LEVEL})`);
ok(countOf(off, 51) === 1 && countOf(on, 51) === 1,
  `Fence จอง 51px ตาม 2 ปุ่มของตัวเอง ทั้งสองโหมด (ปิด ${countOf(off, 51)} / เปิด ${countOf(on, 51)})`);
// ป้าย LL มี min-width:20px คนละอัน ถ้าจำนวนตรงกันแปลว่าจำนวนชิปไม่เปลี่ยน
ok(countOf(off, 20) === countOf(on, 20),
  `จำนวนชิปเท่าเดิมทั้งสองโหมด (${countOf(off, 20)})`);

/* ชิปทุกอันต้องกดกรองได้ รวมถึงเทรดเดอร์ที่ไม่มีเควสในรายการ
   เคยกันไม่ให้กดแล้วเกิดทางตัน: กรองด้วยเทรดเดอร์คนหนึ่งไว้ พอทำเควสของเขาหมด
   ชิปนั้นกดไม่ได้ทั้งที่ยังถูกเลือกอยู่ -> ปลดตัวกรองไม่ได้
   TraderChip ใส่ cursor: default ให้ชิปที่ไม่มี onClick จับตรงนั้นได้ */
group('ชิปเทรดเดอร์กดกรองได้ทุกอัน');
resetState();                                     // Ragman/Fence/Ref ฯลฯ ไม่มีเควสในรายการ
const noClick = (html) => (html.match(/cursor:default/g) || []).length;
ok(noClick(renderHome()) === 0, `ไม่มีชิปที่กดไม่ได้ (ได้ ${noClick(renderHome())})`);
resetState({ eft_selected_quests: '[]' });        // ไม่มีเควสในรายการเลยสักอัน
const bare = renderHome();
ok(noClick(bare) === 0, `รายการว่างเปล่าก็ยังกดได้ทุกชิป (ได้ ${noClick(bare)})`);
ok(Object.keys(chipBlocks(bare)).length === 11, 'รายการว่างเปล่าก็ยังโชว์เทรดเดอร์ครบ 11 คน');

/* ================= แถวตัวกรองแมพ ================= */
group('ชื่อแมพที่ยุบรวม');
resetState();
const maps = renderHome();
const mapsOf = (q) => (q.objectives || []).flatMap((o) => (o.maps || []).map((m) => m?.name));
const questsOn = (name) => TASKS.filter((q) => mapsOf(q).includes(name));

/* อ่าน MAP_ALIAS จากซอร์สจริง ไม่ลอกมาวางซ้ำ — เคยลอกไว้แล้วหลุดกันตอนเกม
   เพิ่มแมพอีเวนต์ใหม่ ตัวตรวจผ่านทั้งที่ชิปจริงเปลี่ยนไปแล้ว */
const homeSrc = readFileSync(path.join(ROOT, 'src/home/home.jsx'), 'utf8');
const aliasBlock = homeSrc.match(/const MAP_ALIAS = \{([\s\S]*?)\};/)?.[1] || '';
const MAP_ALIAS = Object.fromEntries([...aliasBlock.matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
ok(Object.keys(MAP_ALIAS).length > 0, `อ่าน MAP_ALIAS จาก home.jsx ได้ ${Object.keys(MAP_ALIAS).length} รายการ`);

for (const alias of Object.keys(MAP_ALIAS)) {
  ok(!maps.includes(`>${alias}<`), `ไม่มีชิป "${alias}" (ยุบไปกับ "${MAP_ALIAS[alias]}" แล้ว)`);
}
ok(maps.includes('>The Lab<') && maps.includes('>Ground Zero<'), 'ชิปตัวหลักยังอยู่');

/* แถว Maps โชว์ครบทุกแมพเสมอ ไม่ขึ้นกับว่ามีเควสอยู่ในรายการไหม — เหตุผลเดียว
   กับแถว Traders: รายชื่อที่ขยับตามเควสที่เหลือทำให้ปลดตัวกรองที่ค้างไม่ได้ */
const ALL_MAPS = [...new Set(TASKS.flatMap(mapsOf).filter(Boolean).map((n) => MAP_ALIAS[n] || n))];
const shown = (html) => ALL_MAPS.filter((m) => html.includes(`>${m}<`));
ok(shown(maps).length === ALL_MAPS.length,
  `โชว์ครบทุกแมพ ${ALL_MAPS.length} อัน (ขาด: ${ALL_MAPS.filter((m) => !maps.includes(`>${m}<`)).join(', ') || 'ไม่ขาด'})`);
resetState({ eft_selected_quests: '[]' });
ok(shown(renderHome()).length === ALL_MAPS.length, 'รายการว่างเปล่าก็ยังโชว์แมพครบ');

/* ลำดับที่ผู้ใช้กำหนดเอง ไม่ใช่เรียงตามตัวอักษร — ไล่ตามตำแหน่งที่โผล่ใน HTML */
const WANT = ['Factory', 'Night Factory', 'Ground Zero', 'Woods', 'Customs',
  'Lighthouse', 'Interchange', 'Shoreline', 'Reserve', 'Streets of Tarkov',
  'The Lab', 'The Labyrinth', 'Icebreaker'];
const order = ALL_MAPS.map((m) => [m, maps.indexOf(`>${m}<`)])
  .sort((a, b) => a[1] - b[1]).map(([m]) => m);
ok(order.join(' · ') === WANT.join(' · '), `เรียงตามลำดับที่กำหนด\n     ได้: ${order.join(' · ')}`);
// 'Factory' เป็น substring ของ 'Night Factory' ด้วย ถ้าเทียบพลาดจะได้ลำดับผิดแบบเงียบ ๆ
ok(order[0] === 'Factory' && order[1] === 'Night Factory', 'Factory มาก่อน Night Factory ไม่สลับกัน');

/* ยุบได้เพราะเควสที่ติดป้ายเวอร์ชันมืด ติดป้ายตัวหลักไว้ด้วยทุกอัน — ไม่มีอะไรหาย
   ถ้าวันหนึ่งข้อมูลเปลี่ยนจนมีเควสเฉพาะเวอร์ชันมืด ข้อนี้จะเตือนให้กลับมาคิดใหม่ */
const darkOnly = questsOn('The Lab (Dark)').filter((q) => !mapsOf(q).includes('The Lab'));
ok(darkOnly.length === 0,
  `ไม่มีเควสที่มีเฉพาะ The Lab (Dark) (ได้ ${darkOnly.length}${darkOnly.length ? ': ' + darkOnly.map((q) => q.name).join(', ') : ''})`);

/* Night Factory ตรงข้าม — มีเควสเฉพาะกลางคืนจริง เลยต้องเหลือชิปไว้ */
const nightOnly = questsOn('Night Factory').filter((q) => !mapsOf(q).includes('Factory'));
ok(maps.includes('>Night Factory<'), 'Night Factory ยังมีชิปของตัวเอง');
ok(nightOnly.length > 0,
  `Night Factory มีเควสเฉพาะของมัน ${nightOnly.length} อัน (${nightOnly.map((q) => q.name).join(', ')})`);

/* ================= เควสที่ปลดล็อกเทรดเดอร์ ================= */
group('เควสที่ปลดล็อกเทรดเดอร์');
resetState();
const unlockers = TASKS.filter((q) => (q.finishRewards?.traderUnlock || []).length);
ok(unlockers.length === 2, `มี 2 อันในข้อมูล (ได้ ${unlockers.length})`);

/* ปลดล็อกแล้วต้องมีอะไรให้ทำต่อ ซึ่งมาได้สองทาง:
     ก. มีเควสต่อสาย (taskRequirements ชี้มาที่เควสนี้) -> ระบบ leads to เดิมเติมให้เอง
     ข. ไม่มีเลย -> ต้องพึ่งการ์ดข้อเสนอที่ home.jsx อ่าน finishRewards.traderUnlock
   Ref เข้าข่าย ก. (Easy Money - Part 2 ต่อจาก Part 1)
   ส่วน Jaeger ไม่มีอะไรต่อจาก Introduction เลย = เคสที่เคยเงียบหายไป */
const chainedFrom = (id) => TASKS.filter((x) => (x.taskRequirements || []).some((r) => (r.task?.id || r.task) === id));
for (const q of unlockers) {
  const target = q.finishRewards.traderUnlock[0].name;
  const chained = chainedFrom(q.id);
  const picks = QC.getTraderSuggestions(target, { completed: [{ id: q.id }], active: [], limit: Infinity });
  const via = chained.length ? `สายเควสต่อ ${chained.length} อัน` : `การ์ดข้อเสนอ ${picks.length} อัน`;
  ok(chained.length > 0 || picks.length > 0, `${q.trader?.name}/${q.name} -> ${target} มีทางไปต่อ (${via})`);
  ok(picks.every((p) => p.trader?.name === target), `ของที่เสนอให้ ${target} ไม่มีของคนอื่นปน`);
}

const intro = unlockers.find((q) => q.name === 'Introduction');
const jaeger = QC.getTraderSuggestions('Jaeger', { completed: [{ id: intro.id }], active: [], limit: Infinity });
ok(jaeger.length > 0, `Jaeger ได้ข้อเสนอ ${jaeger.length} อัน (เช่น "${jaeger[0]?.name}")`);
ok(chainedFrom(intro.id).length === 0, 'ไม่มีเควสไหนต่อจาก Introduction — การ์ดข้อเสนอจึงเป็นทางเดียว');

/* ================= ของที่ลอยอยู่มุมจอ ================= */
group('ป้าย Undo กับการ์ดเสนอเควส');
const home = readFileSync(path.join(ROOT, 'src/home/home.jsx'), 'utf8');
/* right: '20' (สตริงไม่มีหน่วย) React ไม่เติม px ให้ -> เบราว์เซอร์ทิ้งทั้งบรรทัด
   กลายเป็น right: auto แล้วการ์ดไปนั่งทับป้าย Undo ที่มุมซ้ายล่าง */
ok(!/(left|right|top|bottom):\s*'[\d.]+'/.test(home), "ไม่มีค่าตำแหน่งเป็นสตริงไร้หน่วย (right: '20')");
const undo = home.match(/undoSnap && \([\s\S]{0,400}?position: 'fixed',([^\n]*)/)?.[1] || '';
const floats = [...home.matchAll(/position: 'fixed', right: (\d+), bottom: (\d+), zIndex: \d+/g)];
ok(/left: 20/.test(undo), `ป้าย Undo อยู่มุมซ้ายล่าง (${undo.trim()})`);
ok(floats.length === 2 && floats.every((f) => f[1] === '20' && f[2] === '20'),
  `การ์ดเสนอเควสทั้งสองรูปแบบยึดมุมขวาล่าง (ได้ ${floats.length})`);

/* ================= ความถูกต้องของข้อมูลเควส ================= */
group('ค่าที่ฮาร์ดโค้ดไว้ใน QuestComponent');
/* มี ID เควสเขียนตายไว้ราว 68 ตัว (เควสทางเลือก / ตัวจุดชนวนที่ API ไม่บอก)
   ถ้า BSG ลบหรือเปลี่ยนเควส ค่าพวกนี้จะกลายเป็นค่าที่ไม่ตรงกับอะไรเลยแบบเงียบ ๆ
   ไม่มี error ไม่มีอาการ แค่กลไกนั้นเลิกทำงาน */
const qcSrc = readFileSync(path.join(ROOT, 'src/Component/QuestComponent.jsx'), 'utf8');
const taskById = new Map(TASKS.map((q) => [q.id, q]));
const hardIds = [...new Set(qcSrc.match(/'[0-9a-f]{24}'/g) || [])].map((s) => s.slice(1, -1));
const deadIds = hardIds.filter((id) => !taskById.has(id));
ok(deadIds.length === 0,
  `ID ที่เขียนตายไว้ ${hardIds.length} ตัว ตรงกับเควสจริงทั้งหมด${deadIds.length ? ' — ไม่ตรง: ' + deadIds.join(', ') : ''}`);

group('ความสัมพันธ์ของเควส');
const dangling = TASKS.flatMap((q) => (q.taskRequirements || [])
  .map((r) => r.task?.id || r.task).filter((id) => id && !taskById.has(id))
  .map((id) => `${q.name} -> ${id}`));
ok(dangling.length === 0, `ทุกเงื่อนไขชี้ไปที่เควสที่มีอยู่จริง${dangling.length ? ' — ค้าง: ' + dangling.slice(0, 3).join(', ') : ''}`);
const dupIds = TASKS.map((q) => q.id).filter((id, i, a) => a.indexOf(id) !== i);
ok(dupIds.length === 0, `ไม่มี ID ซ้ำ${dupIds.length ? ': ' + dupIds.join(', ') : ''}`);

group('getPreviousQuestsList กับทุกเควส');
/* ทุกรายการต้องมี status — getNextQuestLists แยก complete/failed ด้วยฟิลด์นี้
   ถ้าขาดไป เควสนั้นจะอยู่ใน history (ไม่ถูกเสนอซ้ำ) แต่ไม่นับว่าเสร็จ
   = สายเควสที่ต่อจากมันจะไม่มีวันปลดล็อก และไม่มีอาการอะไรให้เห็น */
const prevIssues = { threw: [], noSelf: [], unknown: [], noStatus: [] };
for (const q of TASKS) {
  let out;
  try { out = QC.getPreviousQuestsList(q.id, []); }
  catch (e) { prevIssues.threw.push(`${q.name}: ${e.message}`); continue; }
  if (!out.some((u) => u.id === q.id)) prevIssues.noSelf.push(q.name);
  for (const u of out) {
    if (!taskById.has(u.id)) prevIssues.unknown.push(`${q.name} -> ${u.id}`);
    if (u.status !== 'complete' && u.status !== 'failed') prevIssues.noStatus.push(`${q.name} -> ${u.status}`);
  }
}
ok(prevIssues.threw.length === 0, `ไม่มีเควสไหนทำให้พัง${prevIssues.threw.length ? ': ' + prevIssues.threw[0] : ''}`);
ok(prevIssues.noSelf.length === 0, `ผลลัพธ์มีตัวเองเสมอ (ขาด ${prevIssues.noSelf.length})`);
ok(prevIssues.unknown.length === 0, `ไม่คืน ID ที่ไม่มีอยู่ (${prevIssues.unknown.length})`);
ok(prevIssues.noStatus.length === 0, `ทุกรายการมี status (${prevIssues.noStatus.length} ตัวที่ขาด)`);

group('เควสทางเลือก — เลือกสายหนึ่งแล้วอีกสายต้องปิด');
/* ดึงกลุ่มจากซอร์สเอง ไม่ลอกมาวางซ้ำ จะได้ไม่หลุดกันเวลาแก้ฝั่งโค้ด */
const groupNames = ['CHEMICAL_ALTERNATIVE_IDS', 'ONE_LESS_LOOSE_END_ALTERNATIVE_IDS',
  'COLLEAGUES_3_ALTERNATIVE', 'SUPPLY_PLANS_ALTERNETIVE'];
for (const name of groupNames) {
  const line = qcSrc.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  const ids = [...(line?.[1] || '').matchAll(/[0-9a-f]{24}/g)].map((m) => m[0]);
  if (ids.length < 2) { ok(false, `${name}: อ่านกลุ่มจากซอร์สไม่ได้`); continue; }
  const res = QC.getPreviousQuestsList(ids[0], []);
  const failed = res.filter((u) => u.status === 'failed').map((u) => u.id);
  ok(ids.slice(1).every((i) => failed.includes(i)),
    `${taskById.get(ids[0])?.name}: อีก ${ids.length - 1} สายถูกปิดเป็น failed`);
  const trader = taskById.get(ids[1])?.trader?.name;
  const sugg = QC.getTraderSuggestions(trader, { completed: res, active: [], limit: Infinity });
  ok(!sugg.some((s) => ids.includes(s.id)), `สายที่ไม่ได้เลือกไม่ถูกเสนอให้อีก (${trader})`);
}

group('เควสที่วิกิรู้ว่ามีแม่ แต่ API ไม่รู้ (wikiPrev)');
/* เดิม getTraderSuggestions ตัดทุกเควสที่มี wikiPrev ทิ้ง ส่วน getNextQuestLists
   ก็ดูแต่ taskRequirements -> 38 เควสถูกซ่อนโดยไม่มีอะไรพากลับมา
   ตอนนี้เสนอได้เมื่อ wikiPrev ครบแล้ว ข้อตรวจนี้ไล่ทีละตัวว่ากลับมาได้จริง */
Object.keys(mem).forEach((k) => delete mem[k]);
mem.eft_faction_name = '"USEC"';
mem.eft_trader_levels = JSON.stringify(Object.fromEntries(
  [...new Set(TASKS.map((q) => q.trader?.name))].filter(Boolean).map((n) => [n, 4])));

const wikiOnly = TASKS.filter((q) => (q.taskRequirements || []).length === 0 && (q.wikiPrev || []).length > 0);
const gatedIds = new Set([...qcSrc.matchAll(/[0-9a-f]{24}/g)].map((m) => m[0]));
const expectBack = wikiOnly.filter((q) => !gatedIds.has(q.id) && ['Any', 'USEC'].includes(q.factionName));
const stillGone = [];
for (const q of expectBack) {
  const hist = q.wikiPrev.flatMap((p) => [...QC.getAllRequirements(p)].map((id) => ({ id, status: 'complete' })));
  const sug = QC.getTraderSuggestions(q.trader?.name, { completed: hist, active: [], limit: Infinity });
  if (!sug.some((s) => s.id === q.id)) stillGone.push(`${q.name} [${q.trader?.name}]`);
}
ok(wikiOnly.length > 0, `มีเควสแบบนี้อยู่ ${wikiOnly.length} อัน (Jaeger/Ragman เป็นหลัก)`);
ok(stillGone.length === 0,
  `ทำ wikiPrev ครบแล้วถูกเสนอทุกอัน ${expectBack.length}/${expectBack.length}${stillGone.length ? ' — ยังหาย: ' + stillGone.join(', ') : ''}`);

/* ยังต้องไม่เสนอก่อนเวลา — ไม่งั้นก็เท่ากับถอดเงื่อนไขทิ้งไปเฉย ๆ */
const early = expectBack.filter((q) => QC.getTraderSuggestions(q.trader?.name,
  { completed: [], active: [], limit: Infinity }).some((s) => s.id === q.id));
ok(early.length === 0, `ยังไม่ทำ wikiPrev ก็ยังไม่ถูกเสนอ (หลุดมาก่อนเวลา ${early.length})`);

/* Dragnet มี wikiPrev เป็นเควสทางเลือกสองสายที่ทำครบทั้งคู่ไม่ได้ตลอดกาล
   ถ้านับเฉพาะ status === 'complete' เงื่อนไขจะไม่มีวันเป็นจริง */
const dragnet = TASKS.find((q) => q.name === 'Dragnet');
if (dragnet) {
  const hist = QC.getPreviousQuestsList(dragnet.wikiPrev[0], []);
  const sug = QC.getTraderSuggestions(dragnet.trader?.name, { completed: hist, active: [], limit: Infinity });
  ok(sug.some((s) => s.id === dragnet.id), 'Dragnet โผล่หลังเลือกสายใดสายหนึ่ง (อีกสายเป็น failed ก็นับว่าผ่านจุดนั้นแล้ว)');
}

group('ของที่ต้องพกไปวาง / มาร์ก / ใช้');
/* ข้อมูลเก็บไว้คนละฟิลด์ตามชนิด objective — markerItem / item / questItem / useAny
   ถ้าอ่านพลาดไปหนึ่งฟิลด์จะเงียบ ไม่มี error แค่ของหายไปจากการ์ด */
const plantOf = (name) => QC.questPlantItems(TASKS.find((q) => q.name === name));
const byName = (list, n) => list.find((i) => i.name === n);

const wetJob = plantOf('Wet Job - Part 2');
ok(byName(wetJob, 'MS2000 Marker')?.kind === 'mark', 'mark -> อ่าน markerItem (MS2000 Marker)');
/* จำนวนต้อง "บวก" ข้าม objective ไม่ใช่เอาค่ามากสุด — แต่ละจุดกินของของตัวเอง
   เคยใช้ Math.max แล้วบอกน้อยกว่าจริงทุกเคสที่ต้องวางหลายจุด */
const chum = byName(plantOf('Chumming'), 'Golden neck chain');
ok(chum?.count === 6 && chum?.spots === 2, `Chumming: 3 ที่ Customs + 3 ที่ Woods = 6 (ได้ ${chum?.count} / ${chum?.spots} จุด)`);
const thrifty = byName(plantOf('The Survivalist Path - Thrifty'), 'Iskra ration pack');
ok(thrifty?.count === 2 && thrifty?.spots === 2, `บังเกอร์ 2 จุด จุดละ 1 = 2 (ได้ ${thrifty?.count})`);
const route = byName(plantOf('Route Deviation'), 'MS2000 Marker');
ok(route?.count === 6 && route?.spots === 6, `มาร์ก 6 ป้าย BTR = MS2000 6 ดอก (ได้ ${route?.count})`);
const ref27 = byName(plantOf('Is This a Reference?'), 'WI-FI Camera');
ok(ref27?.count === 27, `Is This a Reference? ต้องใช้กล้อง 27 ตัว (ได้ ${ref27?.count})`);
/* กรองตามแมพแล้วตัวเลขต้องเหลือเฉพาะของแมพนั้น ไม่ใช่ยอดรวมทั้งเควส */
const chumCustoms = QC.questPlantItems(TASKS.find((q) => q.name === 'Chumming'), 'Customs');
ok(byName(chumCustoms, 'Golden neck chain')?.count === 3, `กรอง Customs แล้วเหลือ 3 ไม่ใช่ 6 (ได้ ${byName(chumCustoms, 'Golden neck chain')?.count})`);
ok(QC.questPlantItems(TASKS.find((q) => q.name === 'Is This a Reference?'), 'Factory').length > 0,
  'เควสที่กระจายหลายแมพ กรองทีละแมพแล้วยังเจอ');
const airmail = plantOf('Airmail');
ok(airmail.length >= 2 && airmail.every((i) => i.kind === 'use' && i.anyOf),
  `useItem -> อ่าน useAny ครบทุกตัวเลือกและทำเครื่องหมายว่าเลือกอันไหนก็ได้ (${airmail.length} ตัวเลือก)`);
const hcp6 = plantOf('Health Care Privacy - Part 6');
ok(byName(hcp6, 'Blood sample')?.kind === 'plant', 'plantQuestItem -> อ่าน questItem (ของจาก objective ก่อนหน้า)');

const allPlants = TASKS.map((q) => QC.questPlantItems(q)).filter((p) => p.length);
ok(allPlants.length > 80, `มีเควสที่ต้องพกของไปวาง ${allPlants.length} อัน`);
ok(allPlants.flat().every((i) => i.id && i.name && i.kind), 'ทุกรายการมี id / ชื่อ / ชนิดครบ');

/* กรองตามแมพต้องรับชื่อรุ่นย่อยด้วย ไม่งั้นของบนแมพพวกนั้นหายไปจากหน้าแมพ */
const variantCheck = TASKS.filter((q) => (q.objectives || []).some((o) =>
  (o.maps || []).some((m) => ['Ground Zero 21+', 'The Lab (Dark)'].includes(m?.name)) && QC.PLACE_KIND[o.type]));
const lost = variantCheck.filter((q) => {
  const want = (q.objectives || []).some((o) => (o.maps || []).some((m) => m?.name === 'The Lab (Dark)'))
    ? 'The Lab' : 'Ground Zero';
  return QC.questPlantItems(q, want).length === 0 && QC.questPlantItems(q).length > 0;
});
ok(lost.length === 0,
  `ชื่อแมพรุ่นย่อยถูกนับเป็นแมพหลัก ${variantCheck.length} เควส${lost.length ? ' — หาย: ' + lost.map((q) => q.name).join(', ') : ''}`);

group('ข้อมูลใน localStorage เสียหาย');
/* dropFromActive เคยใช้ JSON.parse ตรง ๆ แล้วโยน error กลางคัน ซึ่งแย่เป็นพิเศษ
   เพราะผู้เรียก (AddQuest / Kappa) เขียน eft_completed_quests ไปก่อนแล้ว
   -> เควสถูกบันทึกว่าเสร็จ แต่ไม่ถูกถอดจาก "กำลังทำ" = ค้างสองสถานะพร้อมกัน */
for (const [key, junk] of [['eft_selected_quests', 'ไม่ใช่ json'], ['eft_objective_checklist', '[[['],
  ['eft_trader_levels', '{พัง'], ['eft_faction_name', 'USEC']]) {
  Object.keys(mem).forEach((k) => delete mem[k]);
  mem[key] = junk;
  let threw = null;
  try { QC.dropFromActive(['x']); QC.getTraderLevels(); QC.getFaction(); } catch (e) { threw = e.message; }
  ok(!threw, `${key} เสียหายแล้วไม่โยน error${threw ? ': ' + threw : ''}`);
}

/* ================= ความสว่างของตัวหนังสือ ================= */
group('คอนทราสต์ของสีตัวหนังสือ (WCAG)');
/* หน้าเว็บพื้นเข้มทั้งแอป ตัวหนังสือสีเทาอมน้ำเงินจึงจมง่าย
   วัดเทียบพื้นที่เข้มที่สุดที่มีตัวหนังสือวางอยู่จริง = #1e293b (เซลล์ตาราง Ballistics)
   เกณฑ์ AA ของตัวอักษรขนาดปกติคือ 4.5 */
const relLum = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/* เล็ง AAA ไม่ใช่ AA — พื้นเข้มล้วนทั้งแอป ตัวหนังสือเทาอมน้ำเงินจมง่าย
   และคนใช้งานจริงขอให้เน้นเห็นชัด ไม่ใช่แค่ "ผ่านเกณฑ์ขั้นต่ำ" */
const AAA = 7.0;
const DARKEST_TEXT_BG = '#1e293b';
const panel = readFileSync(path.join(ROOT, 'src/Component/PanelUI.jsx'), 'utf8');
const paletteOf = (key) => panel.match(new RegExp(`\\b${key}:\\s*'(#[0-9a-fA-F]{6})'`))?.[1];
const LEVELS = ['text', 'muted', 'label', 'dim'];
const got = LEVELS.map((k) => [k, paletteOf(k)]);
ok(got.every(([, v]) => v), `อ่านสีจากพาเลตต์ได้ครบ (${got.map(([k, v]) => `${k}=${v}`).join(' ')})`);
for (const [k, v] of got) {
  if (!v) continue;
  const r = contrast(v, DARKEST_TEXT_BG);
  ok(r >= AAA, `P.${k} ${v} คอนทราสต์ ${r.toFixed(2)} บนพื้น ${DARKEST_TEXT_BG} (ต้อง >= ${AAA})`);
}
/* ลำดับความสว่างต้องไม่สลับ ไม่งั้นลำดับความสำคัญของข้อความจะอ่านไม่ออก */
const ratios = got.map(([, v]) => contrast(v, DARKEST_TEXT_BG));
ok(ratios.every((r, i) => i === 0 || r < ratios[i - 1]),
  `เรียงจากสว่างไปหม่นตามลำดับ text > muted > label > dim (${ratios.map((r) => r.toFixed(1)).join(' > ')})`);

/* กวาดสีตัวหนังสือที่เขียนตายไว้ในทุกไฟล์ด้วย — พาเลตต์คุมได้แค่ที่เรียกใช้ P */
const srcFiles = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx?|css)$/.test(f)) srcFiles.push(p);
  }
}(path.join(ROOT, 'src')));
/* วัดสองด้าน: สีหนึ่งต้องอ่านออกบนพื้นเข้มหรือพื้นสว่างอย่างน้อยหนึ่งแบบ
   เพราะมีตัวหนังสือสีเข้มวางบนป้ายสีสดอยู่ด้วย (คะแนนในตาราง Ballistics
   ใช้ #1c1917 บนพื้นเหลือง/เขียว ซึ่งถูกต้อง) ถ้าวัดแต่พื้นเข้มจะฟ้องผิด
   ที่ต้องจับคือสีเทากลาง ๆ ที่อ่านไม่ออกทั้งสองแบบ — #64748b เดิมเข้าข่ายพอดี */
const LIGHT_BG = '#e2e8f0';
const unreadable = new Map();
for (const f of srcFiles) {
  const body = readFileSync(f, 'utf8');
  /* เฉพาะ color: / fg: — ไม่เอา background-color / border-color / stroke
     และไม่เอา `x.color :` ซึ่งเป็นเทอร์นารี ไม่ใช่การประกาศพร็อพเพอร์ตี้
     (เคยนับ background: tq.visible ? tq.color : '#475569' เป็นสีตัวหนังสือ) */
  for (const m of body.matchAll(/(?<![.\w-])(?:color|fg)\s*:\s*['"]?(#[0-9a-fA-F]{6})/g)) {
    const hexv = m[1].toLowerCase();
    const best = Math.max(contrast(hexv, DARKEST_TEXT_BG), contrast(hexv, LIGHT_BG));
    if (best < AAA) unreadable.set(hexv, `${hexv} (${path.basename(f)}, ดีสุด ${best.toFixed(2)})`);
  }
}
ok(unreadable.size === 0,
  `สีตัวหนังสือทุกสีถึง AAA บนพื้นใดพื้นหนึ่ง${unreadable.size ? ' — ยังไม่ถึง: ' + [...unreadable.values()].join(', ') : ''}`);

/* ขนาดตัวอักษร: สายตาที่เริ่มเพ่งต้องการขนาดพอ ๆ กับคอนทราสต์
   ตั้งพื้นไว้ที่ 12px (0.75rem) ไม่ให้มีอะไรเล็กกว่านั้นหลุดเข้ามาใหม่ */
const MIN_PX = 12;
const tooSmall = [];
for (const f of srcFiles) {
  const body = readFileSync(f, 'utf8');
  // รวม `fontSize: 11` แบบตัวเลขเปล่าด้วย — React เติม px ให้เอง เลยหลุดตาได้ง่าย
  for (const m of body.matchAll(/font-?[sS]ize\s*:\s*['"]?([0-9.]+)(px|rem)?/g)) {
    const px = m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
    if (px < MIN_PX) tooSmall.push(`${m[1]}${m[2] || ''} (${path.basename(f)})`);
  }
}
ok(tooSmall.length === 0,
  `ไม่มีตัวอักษรเล็กกว่า ${MIN_PX}px${tooSmall.length ? ' — ' + [...new Set(tooSmall)].slice(0, 6).join(', ') : ''}`);

console.log(bad ? `\n✗ ไม่ผ่าน ${bad} ข้อ` : '\n✓ ผ่านหมด');
process.exit(bad ? 1 : 0);
