#!/usr/bin/env node
/* =========================================================================
 * update-maps.mjs
 * ดึง "ภาพแมพ SVG แบบหลายชั้น" + metadata พิกัด มาเก็บไว้ในโปรเจกต์
 *
 * ที่มา: โปรเจกต์ the-hideout/tarkov-dev-svg-maps (CC BY-NC-SA 4.0)
 * ซึ่ง README ระบุว่าทำมาให้ชุมชนเอาไปสร้างเครื่องมือ (quest tracker / map overlay)
 * ไฟล์ SVG แยกชั้นเป็น <g id="..."> ต่อชั้น -> เปิด/ปิดชั้นได้ถ้า inline ลง DOM
 * metadata (bounds / rotation / ชั้น / ช่วงความสูง) มาจาก src/data/maps.json
 * ของ tarkov.dev
 *
 * เดิมหน้า Map ของเรา hotlink assets.tarkov.dev ตรง ๆ และใช้ค่า calibrate ที่จูนมือ
 * -> ย้ายมาเก็บเองจะเร็วกว่า ไม่พึ่ง CDN คนอื่น และได้ค่าพิกัดที่ถูกต้องจริง
 *
 * สูตรวางหมุด (ตรวจกับข้อมูลจริงแล้ว 99-100% ของจุดตกในกรอบทุกแมพ):
 *   bounds = [[x1, z1], [x2, z2]]   <-- คอมโพเนนต์แรกคือแกน x, ที่สองคือแกน z
 *   ภาพ SVG: ด้านกว้าง = แกน x, ด้านสูง = แกน z (ยืนยันจากอัตราส่วน viewBox)
 * ========================================================================= */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src', 'data', 'map_layers.json');
const SVG_DIR = resolve(ROOT, 'public', 'maps');
const SVG_PREFIX = 'maps/';
const META_URL = 'https://raw.githubusercontent.com/the-hideout/tarkov-dev/main/src/data/maps.json';
const CREDIT = 'SVG maps by the-hideout/tarkov-dev-svg-maps contributors (CC BY-NC-SA 4.0)';
const UA = 'EFT_TaskTrack/1.0 (https://github.com/ptozax/EFT_TaskTrack) build-time data fetch';

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

async function fetchText(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn(`  ! ${url} attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const readExisting = async () => {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    return null;
  }
};

// ดึงชื่อชั้นที่มีอยู่จริงในไฟล์ SVG -> กัน metadata ระบุชั้นที่ไฟล์ไม่มี
const layerIdsIn = (svg) => {
  const ids = new Set();
  for (const m of svg.matchAll(/<g[^>]*\bid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
};

/**
 * SVG พวกนี้ประกาศ <style> ด้วยชื่อคลาสกลาง ๆ (.building .land .floor .danger)
 * ถ้า inline ลงหน้าเว็บตรง ๆ CSS จะกลายเป็น global ไปคุมอิลิเมนต์อื่นของแอป
 * -> เติม scope ให้ selector ทุกตัว (.eft-map-svg .building { ... }) ตอนนี้ทีเดียว
 *    ตรวจแล้วว่าไม่มี at-rule (@media/@keyframes) ในไฟล์ จึงไม่ต้องยกเว้นอะไร
 */
const SCOPE = '.eft-map-svg';
const scopeStyles = (svg) => svg.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (all, attrs, css) => {
  if (/@/.test(css)) return all;   // มี at-rule -> ไม่แตะ ปลอดภัยกว่า
  const scoped = css.replace(/(^|\})([^{}]+)\{/g, (m, close, sel) => {
    const list = sel.split(',').map((one) => {
      const t = one.trim();
      return t ? `${SCOPE} ${t}` : t;
    }).filter(Boolean).join(', ');
    return `${close}${list}{`;
  });
  return `<style${attrs}>${scoped}</style>`;
});

const viewBoxOf = (svg) => {
  const m = svg.match(/viewBox="([\d.\-\s]+)"/);
  if (!m) return null;
  const p = m[1].trim().split(/\s+/).map(Number);
  return p.length === 4 ? { x: p[0], y: p[1], width: p[2], height: p[3] } : null;
};

async function main() {
  const force = process.argv.includes('--force');
  const existing = await readExisting();

  console.log('→ ดึง metadata แมพจาก tarkov.dev ...');
  const metaRaw = await fetchText(META_URL);
  const metaHash = sha(metaRaw);
  const meta = JSON.parse(metaRaw);

  if (!force && existing?.metaHash === metaHash && existing.maps?.length) {
    console.log(`✓ metadata ไม่เปลี่ยน (${existing.maps.length} แมพ) — ข้ามการดึง`);
    console.log(`  ดึงครั้งล่าสุด: ${existing.fetchedAt || 'ไม่ทราบ'} | ใส่ --force เพื่อดึงใหม่`);
    return;
  }

  await mkdir(SVG_DIR, { recursive: true });
  const maps = [];
  const skipped = [];

  for (const entry of meta) {
    const variants = entry.maps || [];
    // variant เดียวมีได้ทั้ง SVG (ภาพวาด) และ tile (ภาพจริงจากเกม) โดยใช้พิกัดชุดเดียวกัน
    const svgVariant = variants.find((v) => v.projection === 'interactive' && (v.svgPath || v.tilePath));
    if (!svgVariant) {
      skipped.push(`${entry.normalizedName} (ไม่มีทั้ง svg และ tile)`);
      continue;
    }

    const file = svgVariant.svgPath ? svgVariant.svgPath.split('/').pop() : null;
    process.stdout.write(`→ ${entry.normalizedName} (${file || 'tile เท่านั้น'}) ... `);

    let svg = null;
    if (svgVariant.svgPath) {
      svg = scopeStyles(await fetchText(svgVariant.svgPath));
      await writeFile(resolve(SVG_DIR, file), svg);
    }

    const present = svg ? layerIdsIn(svg) : new Set();
    const vb = svg ? viewBoxOf(svg) : null;

    // ชั้นของแมพ: ชั้นพื้นมาจาก svgLayer ตัวหลัก ที่เหลือมาจาก layers[]
    const floors = [
      {
        name: 'Ground',
        svgLayer: svgVariant.svgLayer || null,
        extents: svgVariant.heightRange ? [{ height: svgVariant.heightRange, areas: [] }] : [],
        show: true,
        inFile: svgVariant.svgLayer ? present.has(svgVariant.svgLayer) : false,
      },
      ...(svgVariant.layers || []).map((l) => ({
        name: l.name,
        svgLayer: l.svgLayer || null,
        // extents = ขอบเขตของชั้นนั้น แยกตามอาคาร: ต้องอยู่ใน "กรอบพื้นที่" ด้วย
        // ไม่ใช่ดูแค่ความสูง (บางช่วงเขียนเป็น [5.7, 1000] = สูงเท่าไรก็ได้)
        // กรอบเป็น [[x,z],[x,z], ชื่อ] ในระบบพิกัดเดียวกับ bounds ของแมพ
        extents: (l.extents || []).map((e) => ({
          height: e.height || null,
          areas: (e.bounds || []).map((b) => ({
            x: [b[0][0], b[1][0]],
            z: [b[0][1], b[1][1]],
            label: typeof b[2] === 'string' ? b[2] : null,
          })),
        })).filter((e) => e.height || e.areas.length),
        show: l.show !== false,
        inFile: l.svgLayer ? present.has(l.svgLayer) : false,
      })),
    ];

    maps.push({
      normalizedName: entry.normalizedName,
      svgFile: file ? SVG_PREFIX + file : null,
      viewBox: vb,
      // bounds[0] = แกน x, bounds[1] = แกน z (ตรวจกับตำแหน่งจริงแล้ว)
      bounds: svgVariant.bounds,
      /* transform = ตัวแปลงพิกัดเกม -> pixel ที่ต้นทางใช้จริง (ทั้งกับ SVG และ tile)
         เก็บไว้ระดับแมพ เพราะหมุดต้องใช้สูตรเดียวกับภาพ ไม่งั้นเยื้องกัน
         (เคสจริง: The Lab ใช้การเดาทิศทางจากค่า calibrate เก่าแล้วเพี้ยน) */
      transform: svgVariant.transform || null,
      coordinateRotation: svgVariant.coordinateRotation ?? 0,
      heightRange: svgVariant.heightRange || null,
      minZoom: svgVariant.minZoom ?? 1,
      maxZoom: svgVariant.maxZoom ?? 5,
      author: svgVariant.author || null,
      authorLink: svgVariant.authorLink || null,
      floors,
      /* ภาพจริงจากเกม (satellite) เป็นชุด tile z/x/y — ดึงจาก CDN ตอนใช้งาน
         เก็บเองไม่ไหว (z=4 แมพเดียว ~14 MB, z=6 ~223 MB) และ CDN เปิด CORS ให้
         กริดยึดด้วย transform ไม่ใช่ bounds:
           pixel ที่ zoom z = ((transform[0]*lng + transform[1]) * 2^z,
                              (-transform[2]*lat + transform[3]) * 2^z)
           โดย lng/lat มาจากพิกัดเกมที่หมุนด้วย coordinateRotation แล้ว (lat=z, lng=x) */
      tile: svgVariant.tilePath ? {
        url: svgVariant.tilePath,
        size: svgVariant.tileSize || 256,
        transform: svgVariant.transform || null,
        minZoom: svgVariant.minZoom ?? 1,
        maxZoom: svgVariant.maxZoom ?? 6,
      } : null,
      // สไตล์ภาพอื่นที่เขามี (2D = ภาพวาดแบน, 3D = มุมเฉียง) เก็บชื่อไว้อ้างอิง
      otherStyles: variants
        .filter((v) => v.projection !== 'interactive')
        .map((v) => ({ key: v.key, projection: v.projection, author: v.author || null })),
    });
    console.log(`✓ ${svg ? `${(svg.length / 1024).toFixed(0)} KB svg, ` : ''}${floors.length} ชั้น${svgVariant.tilePath ? ', มี satellite' : ''}`);
  }

  if (maps.length < 5) throw new Error(`ได้แค่ ${maps.length} แมพ — โครงข้อมูลอาจเปลี่ยน ยกเลิกการเขียนทับ`);

  const missingLayer = maps.flatMap((m) => m.floors.filter((f) => f.svgLayer && !f.inFile).map((f) => `${m.normalizedName}/${f.svgLayer}`));
  if (missingLayer.length) console.warn(`  ! metadata ระบุชั้นที่ไม่มีในไฟล์ SVG: ${missingLayer.join(', ')}`);
  if (skipped.length) console.log(`  ข้าม: ${skipped.join(', ')}`);

  await writeFile(OUT, JSON.stringify({
    source: 'https://github.com/the-hideout/tarkov-dev-svg-maps',
    license: CREDIT,
    fetchedAt: new Date().toISOString(),
    metaHash,
    maps,
  }));

  console.log(`✓ เขียน ${OUT}`);
  console.log(`  แมพ SVG: ${maps.length} | ชั้นรวม: ${maps.reduce((s, m) => s + m.floors.length, 0)}`);
}

main().catch((err) => { console.error('✗ ล้มเหลว:', err); process.exit(1); });
