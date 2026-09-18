#!/usr/bin/env node
/* =========================================================================
 * update-kappa.mjs
 * สร้าง src/data/kappa.json = รายชื่อเควสที่ต้องทำเพื่อปลดคอนเทนเนอร์ Kappa
 *
 * ทำไมไม่ใช้ kappaRequired จาก tarkov.dev: เขาคำนวณจาก "เงื่อนไขเควสตรงๆ ของ
 * Collector" เท่านั้น (ดูโค้ดเขาเอง the-hideout/tarkov-data-manager ที่
 * jobs/update-quests.mjs -> addPreviousRequirements(neededForKappa, '<Collector>'))
 * ซึ่งได้แค่ 13 เควส แต่ Collector ยังต้องการ Loyalty Level 4 กับ 7 เทรดเดอร์
 * + Scav karma +3 ด้วย เควสที่ต้องทำเพื่อดัน LL4 เลยไม่ถูกนับ
 * -> เช็คลิสต์จริงที่ผู้เล่นใช้มีอยู่แหล่งเดียวคือ EFT Wiki (ฟิลด์ reqkappa
 *    ใน infobox ของแต่ละหน้าเควส)
 *
 * เบากับวิกิ: ขอ wikitext ทีละ 50 หน้าผ่าน generator=categorymembers
 * -> ทั้งหมวด Quests ใช้ประมาณ 18 requests เท่านั้น
 * และรายการนี้แทบไม่เปลี่ยน -> ปกติเช็ค revision ของหมวดก่อน ถ้าไม่ขยับก็จบเลย
 * ใส่ --force เพื่อบังคับดึงใหม่
 *
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-kappa.mjs
 * ========================================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src', 'data', 'kappa.json');
const TASKS = resolve(ROOT, 'src', 'data', 'tasks.json');
const API = 'https://escapefromtarkov.fandom.com/api.php';
const CATEGORY = 'Category:Quests';
const UA = 'EFT_TaskTrack/1.0 (https://github.com/ptozax/EFT_TaskTrack) build-time data fetch';
const FORCE = process.argv.includes('--force');

// กันข้อมูลพัง: วิกิมีอยู่ 250+ เควสเสมอ ถ้าได้น้อยกว่านี้แปลว่า parse ผิด/วิกิล่ม
const MIN_EXPECTED = 200;

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const query = (params) => fetchJson(`${API}?${new URLSearchParams({ ...params, format: 'json' })}`);

/** เวลาแก้ล่าสุดของหน้าในหมวด — ใช้ตัดสินว่าต้องดึงใหม่ไหม (ยิงครั้งเดียว) */
async function categoryTouched() {
  const data = await query({
    action: 'query', generator: 'categorymembers', gcmtitle: CATEGORY,
    gcmlimit: '500', gcmnamespace: '0', gcmsort: 'timestamp', gcmdir: 'desc',
    prop: 'revisions', rvprop: 'timestamp',
  });
  const stamps = Object.values(data.query?.pages || {})
    .map((p) => p.revisions?.[0]?.timestamp)
    .filter(Boolean)
    .sort();
  return stamps[stamps.length - 1] || null;
}

/** ดึง wikitext ของทุกหน้าในหมวด ทีละ 50 หน้า */
async function allQuestPages() {
  const pages = new Map();
  let cont = {};
  let requests = 0;
  do {
    const data = await query({
      action: 'query', generator: 'categorymembers', gcmtitle: CATEGORY,
      gcmlimit: '50', gcmnamespace: '0',
      prop: 'revisions', rvprop: 'content', rvslots: 'main', ...cont,
    });
    requests += 1;
    Object.values(data.query?.pages || {}).forEach((p) => {
      const text = p.revisions?.[0]?.slots?.main?.['*'];
      if (text && !pages.has(p.title)) pages.set(p.title, text);
    });
    cont = data.continue || {};
    // เว้นจังหวะให้วิกิหายใจ
    if (Object.keys(cont).length) await new Promise((r) => setTimeout(r, 400));
  } while (Object.keys(cont).length);
  return { pages, requests };
}

/**
 * ชื่อหน้าวิกิ -> ชื่อเควสในข้อมูลเรา
 * วิกิเติม " (quest)" ต่อท้ายเฉพาะหน้าที่ชื่อชนกับหน้าอื่น (เช่น "Reserve (quest)" ชนกับแมพ Reserve)
 */
const questName = (title) => title.replace(/\s*\(quest\)$/i, '').trim();

async function main() {
  const previous = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);

  const touched = await categoryTouched();
  if (!FORCE && previous && touched && previous.wikiTouched === touched) {
    console.log(`✓ วิกิไม่เปลี่ยนตั้งแต่ ${touched} — ใช้ของเดิม (${previous.questNames.length} เควส)`);
    return;
  }

  console.log(`ดึงหน้าเควสทั้งหมดจาก ${CATEGORY} ...`);
  const { pages, requests } = await allQuestPages();
  console.log(`  ${pages.size} หน้า / ${requests} requests`);

  const questNames = [];
  let withField = 0;
  for (const [title, text] of pages) {
    const m = text.match(/\|\s*reqkappa\s*=\s*(.*)/i);
    if (!m) continue;
    withField += 1;
    if (/\bYes\b/i.test(m[1])) questNames.push(questName(title));
  }
  questNames.sort((a, b) => a.localeCompare(b));

  if (questNames.length < MIN_EXPECTED) {
    throw new Error(`ได้แค่ ${questNames.length} เควส (คาดว่า ≥ ${MIN_EXPECTED}) — ไม่เขียนทับ kappa.json`);
  }

  // เทียบกับ tasks.json เพื่อเตือนชื่อที่จับคู่ไม่ได้ (ไม่ถือว่าพัง — วิกิมีเควสที่ถูกถอดออกจากเกมด้วย)
  const tasks = await readFile(TASKS, 'utf8').then(JSON.parse).catch(() => null);
  if (tasks) {
    const known = new Set(tasks.map((t) => t.name));
    const unmatched = questNames.filter((n) => !known.has(n));
    console.log(`  จับคู่กับ tasks.json ได้ ${questNames.length - unmatched.length}/${questNames.length}`);
    if (unmatched.length) console.log(`  ! ไม่มีใน tasks.json: ${unmatched.join(', ')}`);
  }

  const out = {
    source: 'https://escapefromtarkov.fandom.com/wiki/Category:Quests',
    note: 'ฟิลด์ reqkappa ใน infobox ของแต่ละหน้าเควส',
    license: 'CC BY-SA 3.0',
    fetchedAt: new Date().toISOString(),
    wikiTouched: touched,
    pagesScanned: pages.size,
    pagesWithField: withField,
    questNames,
  };
  await writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`✓ src/data/kappa.json — ${questNames.length} เควส`);
}

main().catch(async (err) => {
  console.error('✗ update-kappa ล้มเหลว:', err.message);
  // รายชื่อ commit ไว้ในรีโปอยู่แล้ว — วิกิล่มไม่ควรทำให้ build/refresh ทั้งชุดพัง
  // (update-all ต่อด้วย && ถ้าตรงนี้ exit 1 ตัวที่เหลือจะไม่ได้รันเลย)
  const kept = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);
  if (kept?.questNames?.length) {
    console.error(`  ใช้ของเดิมต่อไป (${kept.questNames.length} เควส, ดึงเมื่อ ${kept.fetchedAt})`);
    return;
  }
  process.exit(1);
});
