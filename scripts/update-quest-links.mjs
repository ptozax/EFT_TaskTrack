#!/usr/bin/env node
/* =========================================================================
 * update-quest-links.mjs
 * สร้าง src/data/quest_links.json = ความสัมพันธ์ของเควสที่ json.tarkov.dev ไม่มี
 *
 * ทำไมต้องมี: ผังเควสลากเส้นจาก taskRequirements เท่านั้น แต่ API ให้มาไม่ครบ
 * เช็คแล้ว 243 จาก 515 เควสไม่มีทั้งแม่และลูก และ 166 ตัวในนั้น API ให้
 * taskRequirements / traderRequirements / minPlayerLevel ว่างทั้งหมด
 * (ตัวอย่าง Background Check -> ทั้งสามฟิลด์ว่าง ทั้งที่ในเกมมีเงื่อนไขจริง)
 *
 * วิกิมีข้อมูลนี้ใน infobox:
 *   previous        -> เควสก่อนหน้า (เพิ่มเส้นให้ผังได้ ~74 เส้น)
 *   LL requirement  -> ต้องมี Loyalty Level เท่าไร
 *   LL quests       -> ต้องทำเควสของเทรดเดอร์นั้นมาแล้วกี่อัน
 * กลไกจริงในเกมส่วนใหญ่คือ LL + จำนวนเควสที่ทำกับเทรดเดอร์ ไม่ใช่เควสเจาะจง
 *
 * สำคัญ: ไม่เอาไปใส่ taskRequirements เพราะนั่นคือตรรกะที่หน้า Home/Kappa
 * ใช้ตัดสินว่าเควสเริ่มได้หรือยัง ถ้าเอาข้อมูลวิกิ (ซึ่งอาจเก่า/ผิด) ไปผสม
 * จะทำให้การนับ/การปลดล็อกเพี้ยน -> เก็บแยกเป็น wikiPrev / loyalty ให้ผังใช้อ่านเท่านั้น
 *
 * เบากับวิกิ: ขอ wikitext ทีละ 50 หน้า -> ทั้งหมวดใช้ ~18 requests
 * ใส่ --force เพื่อบังคับดึงใหม่
 *
 * ต้องใช้ Node 18+ -> nvm use 22 && node scripts/update-quest-links.mjs
 * ========================================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src', 'data', 'quest_links.json');
const TASKS = resolve(ROOT, 'src', 'data', 'tasks.json');
const API = 'https://escapefromtarkov.fandom.com/api.php';
const CATEGORY = 'Category:Quests';
const UA = 'EFT_TaskTrack/1.0 (https://github.com/ptozax/EFT_TaskTrack) build-time data fetch';
const FORCE = process.argv.includes('--force');

// กันข้อมูลพัง: วิกิมีหน้าเควส 800+ เสมอ ถ้าได้น้อยกว่านี้แปลว่า parse ผิด/วิกิล่ม
const MIN_PAGES = 600;

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

/** เวลาแก้ล่าสุดในหมวด — ยิงครั้งเดียวเพื่อตัดสินว่าต้องดึงใหม่ไหม */
async function categoryTouched() {
  const data = await query({
    action: 'query', generator: 'categorymembers', gcmtitle: CATEGORY,
    gcmlimit: '500', gcmnamespace: '0', gcmsort: 'timestamp', gcmdir: 'desc',
    prop: 'revisions', rvprop: 'timestamp',
  });
  const stamps = Object.values(data.query?.pages || {})
    .map((p) => p.revisions?.[0]?.timestamp).filter(Boolean).sort();
  return stamps[stamps.length - 1] || null;
}

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
    if (Object.keys(cont).length) await new Promise((r) => setTimeout(r, 400));
  } while (Object.keys(cont).length);
  return { pages, requests };
}

// ค่าในช่อง infobox — หยุดที่ newline หรือ | เพราะแต่ละช่องอยู่บรรทัดเดียว
const field = (text, key) => {
  const m = text.match(new RegExp(`\\|\\s*${key}\\s*=([^\\n|]*)`));
  return m ? m[1].trim() : '';
};
// ชื่อเควสในลิงก์วิกิ: [[Debut]] หรือ [[Debut|ชื่อที่โชว์]]
const links = (value) => [...(value || '').matchAll(/\[\[([^\]|]+)/g)].map((m) => m[1].trim());

/**
 * ข้อจำกัดฝ่ายที่เขียนไว้ในเนื้อหน้า เช่น
 *   "This quest is only obtainable by [[USEC]] PMCs."
 * json.tarkov.dev ให้ factionName = "Any" กับเควสพวกนี้หลายตัว (เช่น Tigr Safari)
 * ทั้งที่ในเกมรับได้ฝ่ายเดียว -> เสนอเควสที่เล่นไม่ได้ให้ผู้เล่น
 */
const factionLimit = (text) => {
  const m = text.match(/only\s+(?:be\s+)?(?:obtainable|available|accessible|completed|started|acquired)[^.\n]*?\[\[(USEC|BEAR)\]\]/i);
  return m ? m[1].toUpperCase() : null;
};

/**
 * ลำดับเควสของแต่ละเทรดเดอร์ จากตารางในหน้า "Quests" (แท็บละเทรดเดอร์)
 *
 * เป็นแหล่งเดียวที่บอก "เควสแรกของเทรดเดอร์" ได้ — API ไม่มีข้อมูลนี้เลย
 * และหน้าเทรดเดอร์เองก็แค่ชี้มาหน้านี้ ใช้ request เดียวได้ครบทั้ง 11 เทรดเดอร์
 */
async function traderQuestOrder() {
  const data = await query({ action: 'parse', page: 'Quests', prop: 'wikitext' });
  const text = data?.parse?.wikitext?.['*'];
  if (!text) return {};
  const sec = text.slice(text.indexOf('==List of Quests=='));
  const tabs = [...sec.matchAll(/wds-tabs__tab-label\|([^\]]+)\]\]/g)].map((m) => m[1].trim());
  const blocks = sec.split(/<div class="wds-tab__content/).slice(1);

  const out = {};
  tabs.forEach((trader, i) => {
    const rows = [...(blocks[i] || '').matchAll(/^\|\s*\[\[([^\]|]+)/gm)]
      .map((m) => questName(m[1]));
    if (rows.length) out[trader] = rows;
  });
  return out;
}
// วิกิเติม " (quest)" เฉพาะหน้าที่ชื่อชนกับหน้าอื่น (เช่น Reserve ที่ชนกับชื่อแมพ)
const questName = (title) => title.replace(/\s*\(quest\)$/i, '').trim();

async function main() {
  const previous = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);

  const touched = await categoryTouched();
  if (!FORCE && previous && touched && previous.wikiTouched === touched) {
    console.log(`✓ วิกิไม่เปลี่ยนตั้งแต่ ${touched} — ใช้ของเดิม (${Object.keys(previous.quests).length} เควส)`);
    return;
  }

  console.log(`ดึงหน้าเควสทั้งหมดจาก ${CATEGORY} ...`);
  const { pages, requests } = await allQuestPages();
  const traderOrder = await traderQuestOrder();
  console.log(`  ลำดับเควสต่อเทรดเดอร์: ${Object.keys(traderOrder).length} เทรดเดอร์`);
  console.log(`  ${pages.size} หน้า / ${requests} requests`);
  if (pages.size < MIN_PAGES) {
    throw new Error(`ได้แค่ ${pages.size} หน้า (คาดว่า ≥ ${MIN_PAGES}) — ไม่เขียนทับ quest_links.json`);
  }

  const quests = {};
  for (const [title, text] of pages) {
    const name = questName(title);
    const entry = {};

    const prev = links(field(text, 'previous')).map(questName).filter((n) => n && n !== name);
    if (prev.length) entry.prev = [...new Set(prev)];

    const ll = field(text, 'LL requirement');
    if (/^\d+$/.test(ll)) entry.ll = Number(ll);

    const llq = field(text, 'LL quests');
    if (/^\d+$/.test(llq)) entry.llQuests = Number(llq);

    const only = factionLimit(text);
    if (only) entry.faction = only;

    if (Object.keys(entry).length) quests[name] = entry;
  }

  // รายงานว่าช่วยผังได้จริงแค่ไหน (ไม่ใช่เงื่อนไขผ่าน/ไม่ผ่าน แค่ให้เห็นตัวเลข)
  const tasks = await readFile(TASKS, 'utf8').then(JSON.parse).catch(() => null);
  if (tasks) {
    const byName = new Map(tasks.map((t) => [t.name, t]));
    let newEdges = 0;
    let unmatched = 0;
    tasks.forEach((t) => {
      const have = new Set((t.taskRequirements || []).map((r) => r.task?.id));
      (quests[t.name]?.prev || []).forEach((n) => {
        const p = byName.get(n);
        if (!p) { unmatched += 1; return; }
        if (!have.has(p.id) && p.id !== t.id) newEdges += 1;
      });
    });
    const factionFix = tasks.filter((t) => {
      const w = quests[t.name]?.faction;
      return w && (!t.factionName || t.factionName === 'Any');
    });
    console.log(`  ข้อจำกัดฝ่ายที่วิกิมีแต่ API ไม่มี: ${factionFix.length} เควส`);
    if (factionFix.length) console.log(`    ${factionFix.slice(0, 8).map((t) => `${t.name} -> ${quests[t.name].faction}`).join(' | ')}`);

    /* เตือนเมื่อวิกิกับ API ไม่ตรงกัน — ข้อมูลทั้งสองฝั่งเปลี่ยนได้ตลอด
       ถ้าไม่เตือน เควสผิดฝ่ายจะกลับมาโผล่ให้ผู้เล่นแบบเงียบ ๆ อีก
       (เควสที่มีสองเวอร์ชันแยกฝ่ายอยู่แล้วไม่นับ เพราะวิกิมีหน้าเดียวระบุได้ฝ่ายเดียว) */
    const nameCount = tasks.reduce((m, t) => m.set(t.name, (m.get(t.name) || 0) + 1), new Map());
    const conflicts = tasks.filter((t) => {
      const w = quests[t.name]?.faction;
      return w && ['BEAR', 'USEC'].includes(t.factionName) && w !== t.factionName && nameCount.get(t.name) === 1;
    });
    if (conflicts.length) {
      console.warn(`  ! วิกิกับ API ระบุฝ่ายไม่ตรงกัน ${conflicts.length} เควส — ตรวจก่อนใช้:`);
      conflicts.forEach((t) => console.warn(`      ${t.name}: API=${t.factionName} วิกิ=${quests[t.name].faction}`));
    }
    const withLL = tasks.filter((t) => quests[t.name]?.ll !== undefined).length;
    console.log(`  เส้นเชื่อมที่เพิ่มให้ผัง: ${newEdges} | เควสที่รู้ Loyalty Level: ${withLL} | ชื่อที่จับคู่ไม่ได้: ${unmatched}`);
    // เควสแรกของแต่ละเทรดเดอร์ = ตัวแรกในลำดับที่ยังไม่มีเงื่อนไขเควสก่อนหน้า
    const starters = Object.entries(traderOrder).map(([tr, names]) => {
      const hit = names.map((n) => byName.get(n)).find((q) => q && (q.taskRequirements || []).length === 0);
      return hit ? `${tr}: ${hit.name}` : null;
    }).filter(Boolean);
    console.log(`  เควสเริ่มต้นที่หาเจอ: ${starters.length} เทรดเดอร์`);
  }

  const out = {
    source: 'https://escapefromtarkov.fandom.com/wiki/Category:Quests',
    note: 'ช่อง previous / LL requirement / LL quests ใน infobox ของแต่ละหน้าเควส',
    license: 'CC BY-SA 3.0',
    fetchedAt: new Date().toISOString(),
    wikiTouched: touched,
    pagesScanned: pages.size,
    quests,
    traderOrder,
  };
  await writeFile(OUT, JSON.stringify(out, null, 1));
  console.log(`✓ src/data/quest_links.json — ${Object.keys(quests).length} เควส`);
}

main().catch(async (err) => {
  console.error('✗ update-quest-links ล้มเหลว:', err.message);
  // ไฟล์นี้ commit ไว้ในรีโป วิกิล่มไม่ควรทำให้ build/refresh ทั้งชุดพัง
  const kept = await readFile(OUT, 'utf8').then(JSON.parse).catch(() => null);
  if (kept?.quests && Object.keys(kept.quests).length) {
    console.error(`  ใช้ของเดิมต่อไป (${Object.keys(kept.quests).length} เควส, ดึงเมื่อ ${kept.fetchedAt})`);
    return;
  }
  process.exit(1);
});
