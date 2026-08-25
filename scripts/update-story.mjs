#!/usr/bin/env node
/* =========================================================================
 * update-story.mjs
 * สร้าง src/data/story.json = "Story chapters" ทางการของ Tarkov (10 บท + endings)
 *
 * ทำไมไม่ดึงจาก tarkov.dev: story chapter ไม่ใช่เควสของ trader จึงไม่มีใน
 * json.tarkov.dev เลย (เช็คแล้ว ทั้ง 10 ชื่อไม่มีใน tasks) และ GraphQL schema
 * ก็ไม่มี type story -> แหล่งเดียวที่มีข้อมูลเป็นระบบคือ EFT Wiki (MediaWiki API)
 *
 * เนื้อเรื่องเปลี่ยนแค่ตอนเกมออกเนื้อหาใหม่ (ปีละไม่กี่ครั้ง) -> ปกติสคริปต์นี้
 * ใช้ request เดียวเช็ค revision ของทุกหน้า ถ้าไม่ขยับก็จบเลย ไม่ดึงซ้ำ
 * ใส่ --force เพื่อบังคับดึงใหม่ทั้งหมด
 *
 * ต้องใช้ Node 18+ (global fetch) -> nvm use 22 && node scripts/update-story.mjs
 * ========================================================================= */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src', 'data', 'story.json');
const IMG_DIR = resolve(ROOT, 'public', 'story');   // เก็บรูปไว้เสิร์ฟจากโดเมนเราเอง
const IMG_PREFIX = 'story/';                        // path ที่หน้าเว็บใช้ (ต่อท้าย BASE_URL)
const API = 'https://escapefromtarkov.fandom.com/api.php';
const WIKI = 'https://escapefromtarkov.fandom.com/wiki/';
const INDEX_PAGE = 'Story chapters';
const ENDINGS_PAGE = 'Endings';
// ระบุตัวตนตามธรรมเนียมของ MediaWiki API เพื่อให้ฝั่งวิกิรู้ว่าใครเรียก
const UA = 'EFT_TaskTrack/1.0 (https://github.com/ptozax/EFT_TaskTrack) build-time data fetch';

async function fetchJson(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`  ! ${url} attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const wikitextOf = async (page) => {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&format=json&prop=wikitext`;
  const data = await fetchJson(url);
  if (data.error) throw new Error(`${page}: ${data.error.info || data.error.code}`);
  return data.parse.wikitext['*'];
};

// เวลาแก้ล่าสุดของแต่ละหน้า — ยิงครั้งเดียวได้ทุกหน้า (สูงสุด 50 ชื่อต่อ query)
async function revisionsOf(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const url = `${API}?action=query&titles=${encodeURIComponent(batch.join('|'))}&prop=revisions&rvprop=timestamp&format=json`;
    const data = await fetchJson(url);
    Object.values(data.query?.pages || {}).forEach((p) => {
      // หน้าที่ถูกลบ/เปลี่ยนชื่อจะไม่มี revisions -> ให้ค่าเป็น null = ถือว่าเปลี่ยน
      out[p.title] = p.revisions?.[0]?.timestamp || null;
    });
  }
  return out;
}

/**
 * โหลดรูปจากวิกิมาเก็บใน public/story/ แล้วคืน path ที่หน้าเว็บใช้
 * - ขอเวอร์ชันย่อ (scale-to-width-down) แทนไฟล์เต็ม -> banner 18KB, icon 3.5KB
 * - เสิร์ฟจากโดเมนเราเอง = ไม่ hotlink CDN ของ Fandom ทุกครั้งที่มีคนเปิดหน้า
 *   (ซึ่งเขาบล็อกไว้อยู่แล้ว) และผู้ใช้ไม่ต้องรอ CDN ภายนอก
 */
async function downloadImage(sourceUrl, name, width) {
  if (!sourceUrl) return null;
  const base = sourceUrl.split('/revision/')[0];
  // width = null -> เอาความละเอียดเต็ม (ใช้กับผัง flowchart ที่ต้องซูมอ่านรายละเอียด)
  const url = width ? `${base}/revision/latest/scale-to-width-down/${width}` : `${base}/revision/latest`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/webp,image/png,*/*' } });
  if (!res.ok) {
    console.warn(`  ! โหลดรูป ${name} ไม่ได้: HTTP ${res.status}`);
    return null;
  }
  const type = res.headers.get('content-type') || '';
  const ext = type.includes('webp') ? 'webp' : type.includes('jpeg') ? 'jpg' : 'png';
  const file = `${name}.${ext}`;
  await writeFile(resolve(IMG_DIR, file), Buffer.from(await res.arrayBuffer()));
  return IMG_PREFIX + file;
}

const readExisting = async () => {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null; // ยังไม่มีไฟล์ = ดึงใหม่ทั้งหมด
  }
};

// URL จริงของไฟล์รูปบนวิกิ (banner/icon ของแต่ละบท)
async function imageUrls(files) {
  const uniq = Array.from(new Set(files.filter(Boolean)));
  const out = {};
  for (let i = 0; i < uniq.length; i += 20) {
    const batch = uniq.slice(i, i + 20).map((f) => `File:${f}`);
    const url = `${API}?action=query&titles=${encodeURIComponent(batch.join('|'))}&prop=imageinfo&iiprop=url&format=json`;
    const data = await fetchJson(url);
    Object.values(data.query?.pages || {}).forEach((p) => {
      const src = p.imageinfo?.[0]?.url;
      if (src) out[p.title.replace(/^File:/, '')] = src;
    });
  }
  return out;
}

// ---------- ตัว clean wikitext ----------
const stripMarkup = (s = '') =>
  s
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')   // [[หน้า|ข้อความ]] -> ข้อความ
    .replace(/\[\[([^\]]*)\]\]/g, '$1')            // [[หน้า]] -> หน้า
    .replace(/\{\{[^}]*\}\}/g, '')                 // template ที่เหลือ
    .replace(/<[^>]+>/g, '')                       // แท็ก html เช่น <font>
    .replace(/'''?/g, '')                          // bold / italic
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ตัดเนื้อของ section ตามหัวข้อ == ชื่อ ==
// หมายเหตุ: JS ไม่มี \Z (ถ้าใส่จะกลายเป็นตัวอักษร Z แล้วตัดเนื้อหาตรงคำที่มี Z)
// -> ใช้ $(?![\s\S]) แทนเพื่อหมายถึงท้ายสตริงจริง
const section = (w, name) => {
  const re = new RegExp(`^==\\s*${name}\\s*==\\s*$([\\s\\S]*?)(?=^==[^=]|$(?![\\s\\S]))`, 'm');
  const m = w.match(re);
  return m ? m[1] : '';
};

// ในหัวข้อทางแยกจะมีไอคอนของตอนจบที่เส้นทางนั้นพาไป
// เช่น ===If you refuse Mr. Kerman's offer [[File:Survivor icon.png|...]]===
// -> ดึงชื่อตอนจบออกมาเป็นลิสต์ ทำให้รู้ว่าเลือกอะไรแล้วจบแบบไหน
const endingsInLine = (line) => Array.from(
  new Set(Array.from(line.matchAll(/\[\[File:([A-Za-z ]+?)\s+icon\.png/gi), (m) => m[1].trim())),
);

const parseObjectives = (raw) => {
  const out = [];
  let branch = null;
  let branchEndings = [];
  raw.split('\n').forEach((line) => {
    const t = line.trim();
    if (!t) return;
    // หัวข้อย่อย ===...=== = ทางแยกที่ระบุตอนจบไว้ด้วยไอคอน (ใช้ในบท The Ticket)
    const head = t.match(/^={3,}\s*(.+?)\s*={3,}$/);
    if (head) {
      branchEndings = endingsInLine(head[1]);
      // ตัดไอคอนออกจากข้อความเงื่อนไข เหลือแต่คำอธิบายทางแยก
      branch = stripMarkup(head[1].replace(/\[\[File:[^\]]*\]\]/g, '')) || null;
      return;
    }
    // บรรทัด bold ล้วน = หัวข้อทางแยกของเนื้อเรื่อง
    if (/^'''.*'''$/.test(t) && !t.startsWith('*')) {
      branch = stripMarkup(t) || null;
      branchEndings = endingsInLine(t);
      return;
    }
    const m = t.match(/^(\*+)\s*(.+)$/);
    if (!m) return;
    const depth = m[1].length - 1;
    const optional = /\(''Optional''\)/i.test(m[2]);
    const text = stripMarkup(m[2].replace(/\(''Optional''\)\s*/i, ''));
    if (!text) return;
    if (depth > 0 && out.length) out[out.length - 1].sub.push({ text, optional });
    else out.push({ text, optional, branch, branchEndings, sub: [] });
  });
  return out;
};

// ชื่อแมพเอาจากข้อมูลเกมที่มีอยู่แล้ว ใช้แยกว่า link ไหนคือ "สถานที่"
const MAP_NAMES = new Set(
  (() => {
    try {
      return JSON.parse(readFileSync(resolve(ROOT, 'src', 'data', 'maps.json'), 'utf8'))
        .map((m) => m?.name).filter(Boolean);
    } catch {
      return ['Customs', 'Woods', 'Shoreline', 'Interchange', 'Reserve', 'Lighthouse',
        'Streets of Tarkov', 'The Lab', 'Factory', 'Ground Zero', 'Labyrinth'];
    }
  })(),
);

const KNOWN_TRADERS = [
  'Prapor', 'Therapist', 'Fence', 'Skier', 'Peacekeeper', 'Mechanic',
  'Ragman', 'Jaeger', 'Ref', 'Lightkeeper', 'BTR Driver',
];

// ชื่อที่ลิงก์ไว้ในข้อความ ([[Woods]], [[Dollars|USD]] -> Woods, Dollars)
const wikiLinkTargets = (text = '') =>
  Array.from(text.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g), (m) => m[1].trim())
    .filter((t) => !/^(File|Image|Category):/i.test(t));

// ตาราง "Related Quest Items" ในแต่ละขั้นของ Guide
// แถวหนึ่ง = ไอคอน | ชื่อไอเทม | จำนวน | เงื่อนไข | ต้องเป็น found in raid ไหม
const parseQuestItems = (body) => {
  const out = [];
  const tables = body.match(/\{\|[\s\S]*?\|\}/g) || [];
  tables.filter((t) => /Related Quest Items/i.test(t)).forEach((table) => {
    table.split(/^\|-\s*$/m).forEach((row) => {
      const cells = row.split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[|!]/.test(l))
        .map((l) => l.replace(/^[|!]+\s*/, ''))
        .filter((c) => c && !/^colspan/i.test(c) && !/File:/i.test(c));
      if (cells.length < 3) return;
      const [name, amount, requirement, fir] = cells;
      const cleanName = stripMarkup(name);
      if (!cleanName || /^icon$|^item name$|^amount$/i.test(cleanName)) return;
      out.push({
        name: cleanName,
        amount: stripMarkup(amount || ''),
        requirement: stripMarkup(requirement || ''),
        foundInRaid: /yes/i.test(stripMarkup(fir || '')),
      });
    });
  });
  return out;
};

// แปลง section Guide เป็น map: หัวข้อขั้นตอน -> คำอธิบาย/ไอเทม/สถานที่
const parseGuide = (w) => {
  const body = section(w, 'Guide');
  const guide = new Map();
  if (!body) return guide;

  const heads = Array.from(body.matchAll(/^={3,}\s*(.+?)\s*={3,}\s*$/gm));
  heads.forEach((h, i) => {
    const start = h.index + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    const raw = body.slice(start, end);

    // เอาแต่ย่อหน้าอธิบาย: ตัดตาราง / gallery / แท็ก html / บรรทัดรูป ออก
    const prose = raw
      .replace(/\{\|[\s\S]*?\|\}/g, '')
      .replace(/<gallery[\s\S]*?<\/gallery>/gi, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^[<:|!]/.test(l) && !/^\[\[File:/i.test(l) && !/^={3,}/.test(l))
      .map((l) => stripMarkup(l.replace(/^\*+\s*/, '• ')))
      .filter(Boolean)
      .join('\n')
      .slice(0, 1200);   // คุมขนาดไฟล์ ไม่ให้ story.json บวมเกินจำเป็น

    const links = [...wikiLinkTargets(h[1]), ...wikiLinkTargets(raw)];
    guide.set(stripMarkup(h[1]).replace(/\(optional\)\s*/i, '').toLowerCase(), {
      detail: prose,
      items: parseQuestItems(raw),
      maps: Array.from(new Set(links.filter((l) => MAP_NAMES.has(l)))),
      traders: Array.from(new Set(links.filter((l) => KNOWN_TRADERS.includes(l)))),
    });
  });
  return guide;
};

// เทียบข้อความแบบหลวม ๆ (ตัดวรรคตอน/ตัวพิมพ์) เพื่อจับคู่หัวข้อ Guide กับ objective
const norm = (s = '') => stripMarkup(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const detectIn = (text, names) => {
  const low = ` ${text.toLowerCase()} `;
  return names.filter((n) => low.includes(n.toLowerCase()));
};

/**
 * ผูกคำอธิบายจาก Guide เข้ากับ objective ที่ชื่อตรงกัน
 * -> แต่ละขั้นจะบอกได้ว่า "ไปที่ไหน / ใช้อะไร / ทำอะไร" ไม่ใช่แค่ชื่อขั้น
 */
const attachGuide = (objectives, guide) => {
  const entries = Array.from(guide.entries()).map(([k, v]) => [norm(k), v]);

  // หัวข้อ Guide มักเขียนไม่ตรงกับชื่อขั้นเป๊ะ ๆ (Talk to Skier / Speak to Skier)
  // -> วัดความซ้อนทับของคำ แล้วเลือกอันที่คล้ายที่สุดถ้าคล้ายพอ
  const overlap = (a, b) => {
    const A = new Set(a.split(' ').filter((x) => x.length > 2));
    const B = new Set(b.split(' ').filter((x) => x.length > 2));
    if (!A.size || !B.size) return 0;
    let hit = 0;
    A.forEach((x) => { if (B.has(x)) hit += 1; });
    return hit / Math.min(A.size, B.size);
  };

  return objectives.map((o) => {
    const key = norm(o.text);
    let hit = entries.find(([k]) => k === key);
    if (!hit && key.length > 12) hit = entries.find(([k]) => k.includes(key) || key.includes(k));
    if (!hit) {
      let best = null;
      let bestScore = 0;
      entries.forEach((e) => {
        const s = overlap(key, e[0]);
        if (s > bestScore) { bestScore = s; best = e; }
      });
      if (bestScore >= 0.7) hit = best;
    }
    const g = hit ? hit[1] : null;

    const haystack = [o.text, g?.detail || ''].join(' ');
    return {
      ...o,
      detail: g?.detail || '',
      items: g?.items || [],
      maps: Array.from(new Set([...(g?.maps || []), ...detectIn(haystack, Array.from(MAP_NAMES))])),
      traders: Array.from(new Set([...(g?.traders || []), ...detectIn(haystack, KNOWN_TRADERS)])),
    };
  });
};

const parseChapter = (title, w) => {
  const field = (name) => {
    const m = w.match(new RegExp(`\\|\\s*${name}\\s*=([^\\n|]*)`));
    return m ? m[1].trim() : '';
  };
  const displayName = title.replace(/\s*\(story chapter\)$/, '');
  const quote = section(w, 'Description').match(/\{\{quote\|([\s\S]*?)\}\}/);
  // บางบท (Boreas / The Ticket / They Are Already Here) ไม่มี section Description
  // -> ใช้ย่อหน้าเปิดของหน้าแทน เพื่อให้ทุกบทมีข้อความเล่าเรื่อง
  // ต้องแทน {{PAGENAME}} ด้วยชื่อบทก่อน ไม่งั้นประโยคจะเหลือ "is a story chapter in ..."
  const intro = w
    .replace(/\{\{PAGENAME\}\}/g, displayName)
    .replace(/\{\{Infobox[\s\S]*?\n\}\}/i, '')
    .split(/^==/m)[0]
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l
      && !l.startsWith('{{')
      && !l.startsWith('|')
      && !l.includes('File:')
      && !l.startsWith('[[Category')
      && stripMarkup(l).length > 30);

  // บรรทัดรูป/gallery ไม่ใช่เงื่อนไข -> ตัดออก
  const reqs = section(w, 'Requirements')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(<|\[\[File:|File:|Image:|\{\{|\|)/i.test(l))
    .map((l) => stripMarkup(l.replace(/^\*+\s*/, '')))
    .filter((l) => l.length > 3);

  return {
    id: title.replace(/\s*\(story chapter\)$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: title.replace(/\s*\(story chapter\)$/, ''),
    wikiLink: WIKI + encodeURIComponent(title.replace(/ /g, '_')),
    banner: field('image'),
    icon: field('icon'),
    previous: stripMarkup(field('previous')) || null,
    leadsTo: stripMarkup(field('leads to')) || null,
    description: quote ? stripMarkup(quote[1]) : stripMarkup(intro || ''),
    requirements: reqs,
    objectives: attachGuide(parseObjectives(section(w, 'Objectives')), parseGuide(w)),
  };
};

async function main() {
  const force = process.argv.includes('--force');
  const existing = await readExisting();

  // เช็คก่อนด้วย request เดียว: ถ้าไม่มีหน้าไหนถูกแก้ตั้งแต่รอบก่อน ก็ไม่ต้องดึงอะไรเลย
  if (!force && existing?.revisions && existing.chapters?.length) {
    const watched = Object.keys(existing.revisions);
    const now = await revisionsOf(watched);
    const changed = watched.filter((t) => now[t] !== existing.revisions[t]);
    if (!changed.length) {
      console.log(`✓ วิกิไม่มีอะไรเปลี่ยน (${watched.length} หน้า) — ข้ามการดึง ไม่เขียนไฟล์`);
      console.log(`  ดึงครั้งล่าสุด: ${existing.fetchedAt || 'ไม่ทราบ'} | ใส่ --force เพื่อบังคับดึงใหม่`);
      return;
    }
    console.log(`→ มีหน้าที่ถูกแก้ ${changed.length} หน้า: ${changed.join(', ')} — ดึงใหม่`);
  }

  console.log('→ ดึงรายชื่อ story chapter จากวิกิ ...');
  const indexText = await wikitextOf(INDEX_PAGE);
  // เก็บชื่อบทจากคอลัมน์กลางของตาราง: |[[Boreas]] หรือ |[[X (story chapter)|X]]
  // ต้องกรอง File: ออก เพราะคอลัมน์ icon/banner ก็ขึ้นต้นด้วย |[[ เหมือนกัน
  const titles = Array.from(
    new Set(
      Array.from(indexText.matchAll(/^\|\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/gm), (m) => m[1].trim())
        .filter((t) => !/^(File|Image):/i.test(t)),
    ),
  );
  if (!titles.length) throw new Error('อ่านรายชื่อบทจากหน้า Story chapters ไม่ได้ — โครงหน้าอาจเปลี่ยน');
  console.log(`  พบ ${titles.length} บท: ${titles.join(', ')}`);

  const chapters = [];
  for (const t of titles) {
    process.stdout.write(`→ ${t} ... `);
    const chapter = parseChapter(t, await wikitextOf(t));
    chapters.push(chapter);
    console.log(`✓ ${chapter.objectives.length} objectives`);
  }

  console.log('→ Endings ...');
  let endings = [];
  let endingsIntro = '';
  let flowchartSource = null;
  try {
    const w = await wikitextOf(ENDINGS_PAGE);

    // ย่อหน้าเปิดหน้า Endings = คำอธิบายว่าระบบตอนจบทำงานยังไง
    endingsIntro = stripMarkup(
      w.split(/^==/m)[0].split('\n').map((l) => l.trim())
        .filter((l) => l && !l.startsWith('{{') && !l.includes('File:'))
        .join(' '),
    );

    // รูป flowchart ในหัวข้อ Image Guides = เส้นทางไปแต่ละตอนจบ
    const guide = section(w, 'Image Guides').match(/\[\[File:([^|\]]+)/);
    if (guide) flowchartSource = guide[1].trim();

    // ตอนจบอยู่ในหัวข้อระดับ 2 (== Savior == / == Debtor == / ...) ส่วน === Rewards ===
    // เป็นหัวข้อย่อยของแต่ละตอนจบ และ == Image Guides == ไม่ใช่ตอนจบ
    const heads = Array.from(w.matchAll(/^==\s*([^=\n]+?)\s*==\s*$/gm));
    endings = heads
      .filter((m) => !/^(image guides|see also|references|gallery|notes|trivia)$/i.test(m[1].trim()))
      .map((m, i, arr) => {
        const start = m.index + m[0].length;
        const nextHead = arr.find((h) => h.index > m.index);
        const body = w.slice(start, nextHead ? nextHead.index : w.length);

        // {{quote|'''Escaped from Tarkov for humanity:''' <เนื้อเรื่องตอนจบ>}}
        const quote = body.match(/\{\{quote\|([\s\S]*?)\}\}/);
        const inner = quote ? quote[1] : '';
        const bold = inner.match(/^'''([\s\S]*?)'''\s*([\s\S]*)$/);
        const headline = bold ? stripMarkup(bold[1]).replace(/:\s*$/, '') : '';
        const description = stripMarkup(bold ? bold[2] : inner);

        // รายการรางวัลใต้ ===Rewards=== (ข้ามบรรทัดรูปที่ขึ้นต้นด้วย : )
        const rewardsRaw = body.split(/^===\s*Rewards\s*===\s*$/m)[1] || '';
        const rewards = rewardsRaw.split('\n')
          .filter((l) => l.trim().startsWith('*'))
          .map((l) => stripMarkup(l.replace(/^\*+\s*/, '')))
          .filter((l) => l.length > 1);

        const iconMatch = body.match(/\[\[File:([^|\]]+)/);
        return {
          name: stripMarkup(m[1]),
          headline,
          description,
          rewards,
          iconSource: iconMatch ? iconMatch[1].trim() : null,
        };
      })
      .filter((e) => e.description || e.rewards.length);
  } catch (err) {
    console.warn(`  ! ข้าม endings: ${err.message}`);
  }

  console.log('→ URL ของรูป banner/icon ...');
  const urls = await imageUrls([
    ...chapters.flatMap((c) => [c.banner, c.icon]),
    ...endings.map((e) => e.iconSource),
    flowchartSource,
  ]);

  console.log('→ โหลดรูปเก็บไว้ที่ public/story/ ...');
  await mkdir(IMG_DIR, { recursive: true });
  for (const c of chapters) {
    c.bannerSource = urls[c.banner] || null;   // เก็บ URL ต้นทางไว้อ้างอิง/ให้เครดิต
    c.iconSource = urls[c.icon] || null;
    c.bannerFile = await downloadImage(c.bannerSource, `${c.id}-banner`, 600);
    c.iconFile = await downloadImage(c.iconSource, `${c.id}-icon`, 64);
  }
  for (const e of endings) {
    const slug = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    e.iconFile = await downloadImage(urls[e.iconSource] || null, `ending-${slug}-icon`, 96);
    delete e.iconSource;
  }
  // flowchart ของ endings ทำโดยผู้ใช้วิกิ (ชื่ออยู่ในชื่อไฟล์) -> เก็บชื่อไว้ให้เครดิตในหน้า
  // ผังต้องเปิดอ่านรายละเอียดได้ -> เก็บความละเอียดเต็ม (null = ไม่ย่อ)
  const flowchartFile = await downloadImage(urls[flowchartSource] || null, 'endings-flowchart', null);
  const missing = chapters.filter((c) => !c.bannerFile).map((c) => c.name);
  if (missing.length) console.warn(`  ! ไม่ได้ banner ของ: ${missing.join(', ')}`);

  // กันไฟล์ดีถูกทับด้วยข้อมูลพัง ถ้าโครงหน้าวิกิเปลี่ยนแล้ว parser อ่านไม่ออก
  // (แนวเดียวกับ update-data.mjs ที่ไม่เขียนทับเมื่อได้ array ว่าง)
  if (chapters.length < 5) throw new Error(`ได้แค่ ${chapters.length} บท — น่าจะ parse ไม่ออก ยกเลิกการเขียนทับ`);
  const empty = chapters.filter((c) => c.objectives.length === 0).map((c) => c.name);
  if (empty.length) throw new Error(`บทที่ไม่มี objectives: ${empty.join(', ')} — ยกเลิกการเขียนทับ`);
  if (endings.length !== 4) console.warn(`  ! endings ได้ ${endings.length} อัน (ปกติ 4) — วิกิอาจเปลี่ยนโครง`);

  // ประกอบ "เส้นทางไปแต่ละตอนจบ" จากทางแยกที่ระบุไอคอนตอนจบไว้
  // ข้ามทางแยกที่พาไปทุกตอนจบ (เช่น "Identical for all endings") เพราะไม่ได้ชี้ทางอะไร
  endings.forEach((e) => {
    const route = [];
    chapters.forEach((c) => {
      const seen = new Set();
      c.objectives.forEach((o) => {
        if (!o.branch || !o.branchEndings?.length) return;
        if (o.branchEndings.length >= endings.length) return;
        if (!o.branchEndings.includes(e.name) || seen.has(o.branch)) return;
        seen.add(o.branch);
        route.push({ chapter: c.name, condition: o.branch });
      });
    });
    e.route = route;
  });

  // เก็บเวลาแก้ล่าสุดของทุกหน้าที่ใช้ ไว้ให้รอบถัดไปเทียบว่าต้องดึงซ้ำไหม
  console.log('→ บันทึก revision ของหน้าที่ใช้ ...');
  const revisions = await revisionsOf([INDEX_PAGE, ENDINGS_PAGE, ...titles]);

  const payload = {
    source: WIKI + 'Story_chapters',
    license: 'Content from the Escape from Tarkov Wiki (Fandom), CC BY-SA 3.0',
    fetchedAt: new Date().toISOString(),
    revisions,
    chapters,
    endings,
    endingsIntro,
    endingsFlowchart: flowchartFile,
    endingsFlowchartCredit: flowchartSource ? flowchartSource.replace(/\.[a-z]+$/i, '') : null,
    endingsWikiLink: WIKI + ENDINGS_PAGE.replace(/ /g, '_'),
  };
  // ไม่ต้องจัด indent: ไฟล์นี้ไม่ถูก commit แล้ว แต่ถูกฝังลง bundle -> เอาขนาดเล็กกว่า (-36%)
  await writeFile(OUT, JSON.stringify(payload));
  console.log(`✓ เขียน ${OUT}`);
  console.log(`  บท: ${chapters.length} | objectives รวม: ${chapters.reduce((s, c) => s + c.objectives.length, 0)} | endings: ${endings.length}`);
  endings.forEach((e) => console.log(`  · ${e.name}: ${e.headline || '(ไม่มีหัวเรื่อง)'} | รางวัล ${e.rewards.length} รายการ`));
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
