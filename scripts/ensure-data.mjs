#!/usr/bin/env node
/* =========================================================================
 * ensure-data.mjs
 * ไฟล์ข้อมูลทั้งหมดเป็นของ generate ได้ ไม่ถูก track ใน git แล้ว
 * (เดิม commit ไว้ ~18 MB ทำให้ local กับ bot เขียนทับกันและ .git โตวันละ ~8 MB)
 *
 * สคริปต์นี้ทำหน้าที่เดียว: ถ้าไฟล์ไหน "ยังไม่มี" ให้รันสคริปต์ที่สร้างไฟล์นั้น
 * ไฟล์ที่มีอยู่แล้วจะไม่ถูกแตะ -> รันซ้ำได้ไม่เสียเวลา และบน CI ที่ update-all
 * ไปแล้วก็จะไม่ทำอะไรเลย
 *
 * ใช้เป็น predev / prebuild -> clone ใหม่แล้ว npm run dev ได้เลย
 * ========================================================================= */
import { spawn } from 'node:child_process';
import { access, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ไฟล์ที่ต้องมี -> สคริปต์ที่สร้างมัน (เรียงตามลำดับ dependency: items ต้องมาก่อน)
const TARGETS = [
  { files: ['src/data/items.json'], script: 'update-items.mjs' },
  { files: ['src/data/ammo.json', 'src/data/maps.json', 'src/data/hideout.json', 'src/data/tasks.json'], script: 'update-data.mjs' },
  { files: ['public/price_data.json'], script: 'update-price-data.mjs' },
  { files: ['public/gear_data.json'], script: 'update-gear-data.mjs' },
  { files: ['public/optimizer_data.json'], script: 'update-optimizer-data.mjs' },
  { files: ['public/loot_data.json'], script: 'update-loot.mjs' },
  { files: ['src/data/story.json'], script: 'update-story.mjs' },
  { files: ['src/data/map_layers.json'], script: 'update-maps.mjs' },
];

const exists = async (rel) => {
  try {
    await access(resolve(ROOT, rel));
    return true;
  } catch {
    return false;
  }
};

const run = (script, args = []) => new Promise((done, fail) => {
  const child = spawn(process.execPath, [resolve(ROOT, 'scripts', script), ...args], { cwd: ROOT, stdio: 'inherit' });
  child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`${script} exit ${code}`))));
  child.on('error', fail);
});

// รูปของ story ก็ generate มาเหมือนกัน — ถ้า story.json มีแต่รูปหาย ต้องดึงใหม่แบบ force
// (ปกติ update-story จะข้ามเมื่อวิกิไม่เปลี่ยน ซึ่งจะไม่โหลดรูปให้)
const dirEmpty = async (...parts) => {
  try {
    return (await readdir(resolve(ROOT, ...parts))).length === 0;
  } catch {
    return true;
  }
};

async function main() {
  const missing = [];
  for (const target of TARGETS) {
    const gone = [];
    for (const f of target.files) if (!(await exists(f))) gone.push(f);
    if (gone.length) missing.push({ ...target, gone });
  }

  const storyOnlyImages = !missing.some((m) => m.script === 'update-story.mjs')
    && await exists('src/data/story.json')
    && await dirEmpty('public', 'story');

  if (!missing.length && !storyOnlyImages) {
    console.log('✓ ข้อมูลครบแล้ว — ไม่ต้องดึงอะไร');
    return;
  }

  if (missing.length) {
    console.log(`ขาดข้อมูล ${missing.reduce((s, m) => s + m.gone.length, 0)} ไฟล์ — กำลังสร้าง:`);
    missing.forEach((m) => console.log(`  · ${m.gone.join(', ')} (${m.script})`));
    for (const m of missing) await run(m.script);
  }

  if (storyOnlyImages) {
    console.log('รูปของ story หาย — ดึงใหม่ทั้งชุด (update-story.mjs --force)');
    await run('update-story.mjs', ['--force']);
  }

  // เช่นเดียวกับ story: ถ้า metadata แมพมีแต่ไฟล์ SVG หาย ต้องดึงใหม่แบบ force
  if (!missing.some((m) => m.script === 'update-maps.mjs')
      && await exists('src/data/map_layers.json')
      && await dirEmpty('public', 'maps')) {
    console.log('ไฟล์ SVG ของแมพหาย — ดึงใหม่ทั้งชุด (update-maps.mjs --force)');
    await run('update-maps.mjs', ['--force']);
  }

  console.log('✓ ข้อมูลพร้อมแล้ว');
}

main().catch((err) => {
  console.error('✗ เตรียมข้อมูลไม่สำเร็จ:', err.message);
  console.error('  ถ้าตอนนี้ต่อเน็ตไม่ได้ ให้ก๊อปโฟลเดอร์ src/data และ public/*.json จากเครื่องอื่นมาวาง');
  process.exit(1);
});
