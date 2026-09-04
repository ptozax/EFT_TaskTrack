/* =========================================================================
 * mapLayers.js — logic ของ "แมพหลายชั้น" (แยกจาก MapPage เพื่อเทสต์ได้ตรง ๆ)
 *
 * ข้อมูลชั้นมาจาก src/data/map_layers.json (สร้างโดย scripts/update-maps.mjs)
 * แต่ละชั้นมีชื่อ group ใน SVG (svgLayer) และช่วงความสูงของเกม (height)
 * -> เปิด/ปิดชั้น = ซ่อน <g> ใน SVG + กรอง marker ด้วย position.y
 * ========================================================================= */
import mapLayerData from '../data/map_layers.json';

const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** หา entry ของแมพจากชื่อที่หน้า Map ใช้ ("Streets of Tarkov" -> streets-of-tarkov) */
export const findMapLayers = (mapName) => {
  const key = norm(mapName);
  return (mapLayerData.maps || []).find((m) => m.normalizedName === key) || null;
};

/** ชั้นที่ใช้งานได้จริง = metadata ระบุไว้ และมี group นั้นอยู่ในไฟล์ SVG จริง */
export const usableFloors = (entry) =>
  !entry ? [] : (entry.floors || []).filter((f) => f.svgLayer && f.inFile);

/** ขอบเขตของชั้น: [{height:[lo,hi], areas:[{x:[a,b], z:[a,b], label}]}] */
export const floorExtents = (floor) => (floor?.extents || []).filter(Boolean);

const inRange = (v, [a, b]) => v >= Math.min(a, b) && v <= Math.max(a, b);

/**
 * marker อยู่ในขอบเขตของชั้นนี้ไหม
 * ต้องเข้าทั้งช่วงความสูง "และ" กรอบพื้นที่ของอาคาร (ถ้าระบุไว้)
 * เพราะบางชั้นเขียนความสูงเป็น [5.7, 1000] = ไม่จำกัด ถ้าดูแค่ความสูง
 * ของบนพื้นที่อยู่สูงจะถูกดูดขึ้นไปเป็นของชั้นบนหมด
 */
const inFloor = (floor, x, z, y) => floorExtents(floor).some((e) => {
  if (e.height && typeof y === 'number' && !inRange(y, e.height)) return false;
  if (!e.areas || e.areas.length === 0) return !!e.height;
  if (typeof x !== 'number' || typeof z !== 'number') return false;
  return e.areas.some((a) => inRange(x, a.x) && inRange(z, a.z));
});

/**
 * marker ตัวนี้ควรโชว์ไหม เมื่อเปิดชั้นตาม visibleNames
 * - ไม่มีข้อมูลชั้น -> โชว์เสมอ (ไม่ซ่อนของที่ตัดสินไม่ได้)
 * - อยู่ในขอบเขตของชั้นบนไหน -> โชว์เมื่อชั้นนั้นเปิด
 * - ไม่เข้าชั้นบนไหนเลย -> ถือเป็นของชั้นพื้น
 */
export const isMarkerVisible = (entry, visibleNames, pos) => {
  const floors = usableFloors(entry);
  if (!floors.length) return true;
  const { x, y, z } = pos || {};

  const upper = floors.filter((f) => f.name !== 'Ground');
  const owner = upper.find((f) => inFloor(f, x, z, y));
  if (owner) return visibleNames.includes(owner.name);

  const ground = floors.find((f) => f.name === 'Ground');
  return ground ? visibleNames.includes('Ground') : true;
};

/** ชั้นที่ควรเปิดตอนเริ่ม = ชั้นที่ metadata บอก show: true (ปกติคือชั้นพื้น) */
export const defaultVisibleFloors = (entry) =>
  usableFloors(entry).filter((f) => f.show).map((f) => f.name);

/** ป้ายเครดิตผู้วาดแมพ ตามเงื่อนไข CC BY-NC-SA */
export const mapCredit = (entry) => (entry?.author
  ? { author: entry.author, link: entry.authorLink, license: mapLayerData.license }
  : null);

export const mapLayerLicense = mapLayerData.license;
export const mapLayerSource = mapLayerData.source;

/* =========================================================================
 * ภาพจริงจากเกม (satellite) — เป็นชุด tile z/x/y
 *
 * กริด tile ยึดด้วย transform ไม่ใช่ bounds:
 *   หมุนพิกัดเกมด้วย coordinateRotation ก่อน (lat = z, lng = x)
 *   pixel ที่ zoom z = ((t[0]*lng + t[1]) * 2^z, (-t[2]*lat + t[3]) * 2^z)
 * เราจึงคำนวณกรอบของ bounds ในหน่วย pixel แล้ววาง tile เป็น % ของกรอบนั้น
 * -> ภาพ satellite ทับกรอบเดียวกับ SVG พอดี หมุดที่วางด้วย % จึงตรงทั้งสองแบบ
 * ========================================================================= */

export const hasSatellite = (entry) => !!(entry?.tile?.url && entry?.tile?.transform);

/* -------------------------------------------------------------------------
 * แปลงพิกัดเกม <-> % บนภาพ ด้วย bounds ที่ต้นทางเผยแพร่ไว้
 * แทนค่า calibrate ที่จูนมือทีละแมพ (ซึ่งเพี้ยนกับแมพที่เปลี่ยนภาพฐาน เช่น The Lab)
 *
 * ขั้นตอน: หมุนทั้งจุดและมุมกรอบด้วย coordinateRotation เดียวกัน แล้วเทียบสัดส่วน
 * แกนตั้งกลับด้าน (แกน lat เพิ่มขึ้น = ขึ้นบน แต่ % ของภาพนับลงล่าง)
 * ตรวจกับทุกแมพแล้ว: สูตรนี้ตรงกับค่าที่จูนมือไว้ภายใน 1.1% ใน 8 แมพ
 * และแก้ให้ The Lab / The Labyrinth ที่เดิมเพี้ยน 7.3% / 3.1% กลับมาตรง
 * ------------------------------------------------------------------------- */
const rotatePoint = (x, z, deg) => {
  if (!deg) return { lng: x, lat: z };
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { lng: x * cos - z * sin, lat: x * sin + z * cos };
};

/* พิกัด pixel ตามสูตรของต้นทาง (ใช้ทั้งวางภาพและวางหมุด จึงไม่มีทางเยื้องกัน)
   pixel = (t[0]*lng + t[1], -t[2]*lat + t[3])   โดย lng/lat = พิกัดเกมที่หมุนแล้ว
   คิดที่ระดับ 0 พอ เพราะทุกระดับต่างกันแค่คูณ 2^z ซึ่งหายไปเวลาคิดเป็นสัดส่วน */
const toPixel0 = (entry, x, z) => {
  const t = entry.transform;
  const { lng, lat } = rotatePoint(x, z, entry.coordinateRotation || 0);
  return { px: t[0] * lng + t[1], py: -t[2] * lat + t[3] };
};

/* กรอบที่ใช้อ้างอิง ต่างกันตามภาพที่แสดงอยู่:
   - satellite (tile) ใช้ bounds
   - abstract (SVG) ใช้ svgBounds ถ้ามี (ตอนนี้มีแค่ Reserve ที่ภาพ SVG ครอบไม่เท่ากัน) */
const activeBounds = (entry, forSvg) => (forSvg && entry.svgBounds ? entry.svgBounds : entry.bounds);

/** กรอบของแมพในหน่วย pixel ที่ระดับ 0 */
const boundsPixelBox = (entry, forSvg) => {
  const [[x1, z1], [x2, z2]] = activeBounds(entry, forSvg);
  const a = toPixel0(entry, x1, z1);
  const b = toPixel0(entry, x2, z2);
  return {
    left: Math.min(a.px, b.px),
    top: Math.min(a.py, b.py),
    width: Math.abs(b.px - a.px),
    height: Math.abs(b.py - a.py),
  };
};

export const canPlaceByBounds = (entry) => !!(entry?.bounds && entry?.transform);

/** อัตราส่วนของกรอบแมพ (กว้าง/สูง) — ใช้กำหนดขนาดกล่องภาพ */
export const boundsAspect = (entry) => {
  if (!canPlaceByBounds(entry)) return null;
  const box = boundsPixelBox(entry, false);
  return box.height ? box.width / box.height : null;
};

/**
 * ตำแหน่งที่ควรวางภาพ SVG ภายในกล่องที่อ้าง bounds (หน่วย %)
 * แมพอย่าง Reserve ภาพ SVG ครอบพื้นที่ไม่เท่าชุด tile -> ต้องขยับ/ย่อภาพให้ตรงพื้นที่จริง
 * วิธีนี้ทำให้ "หมุดใช้พิกัดชุดเดียว" ทั้งสองสไตล์ สลับไปมาแล้วหมุดไม่ขยับ
 */
export const svgPlacement = (entry) => {
  if (!canPlaceByBounds(entry)) return null;
  if (!entry.svgBounds) return { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 };
  const box = boundsPixelBox(entry, false);
  const svgBox = boundsPixelBox(entry, true);
  return {
    leftPct: ((svgBox.left - box.left) / box.width) * 100,
    topPct: ((svgBox.top - box.top) / box.height) * 100,
    widthPct: (svgBox.width / box.width) * 100,
    heightPct: (svgBox.height / box.height) * 100,
  };
};

/** พิกัดเกม -> ตำแหน่งบนภาพเป็น % (0-100) — forSvg = กำลังแสดงภาพวาด ไม่ใช่ satellite */
export const posToPercent = (entry, pos, forSvg = false) => {
  if (!canPlaceByBounds(entry) || !pos) return null;
  const box = boundsPixelBox(entry, forSvg);
  const p = toPixel0(entry, pos.x, pos.z);
  return {
    x: ((p.px - box.left) / box.width) * 100,
    y: ((p.py - box.top) / box.height) * 100,
  };
};

/** % บนภาพ -> พิกัดเกม (ใช้กับตัวอ่านพิกัดใต้เมาส์ / การปักหมุดเอง) */
export const percentToPos = (entry, xPct, yPct, forSvg = false) => {
  if (!canPlaceByBounds(entry)) return null;
  const box = boundsPixelBox(entry, forSvg);
  const t = entry.transform;
  const px = box.left + (xPct / 100) * box.width;
  const py = box.top + (yPct / 100) * box.height;
  // ผกผันของ toPixel0 แล้วหมุนกลับ
  const lng = (px - t[1]) / t[0];
  const lat = -(py - t[3]) / t[2];
  const back = rotatePoint(lng, lat, -(entry.coordinateRotation || 0));
  return { x: back.lng, z: back.lat };
};

const rotate = (x, z, deg) => {
  if (!deg) return { lng: x, lat: z };
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // สูตรเดียวกับ applyRotation ของ tarkov.dev (หมุน (lng, lat) รอบจุดกำเนิด)
  return { lng: x * cos - z * sin, lat: x * sin + z * cos };
};

const toPixel = (entry, x, z, level) => {
  const t = entry.tile.transform;
  const { lng, lat } = rotate(x, z, entry.coordinateRotation || 0);
  const scale = 2 ** level;
  return { px: (t[0] * lng + t[1]) * scale, py: (-t[2] * lat + t[3]) * scale };
};

/** กรอบของแมพ (ตาม bounds) ในหน่วย pixel ของ tile ที่ zoom level นั้น */
export const tileRect = (entry, level) => {
  if (!hasSatellite(entry) || !entry.bounds) return null;
  const [[x1, z1], [x2, z2]] = entry.bounds;
  const a = toPixel(entry, x1, z1, level);
  const b = toPixel(entry, x2, z2, level);
  return {
    left: Math.min(a.px, b.px),
    top: Math.min(a.py, b.py),
    width: Math.abs(b.px - a.px),
    height: Math.abs(b.py - a.py),
  };
};

/** จำนวน tile ที่ต้องวางทั้งแมพในระดับนั้น */
const tileCount = (entry, level) => {
  const rect = tileRect(entry, level);
  const size = entry.tile.size || 256;
  if (!rect) return 0;
  const cols = Math.ceil((rect.left + rect.width) / size) - Math.floor(rect.left / size);
  const rows = Math.ceil((rect.top + rect.height) / size) - Math.floor(rect.top / size);
  return cols * rows;
};

/**
 * เลือกระดับ tile จาก "ความละเอียดที่ต้องใช้จริงบนจอ" ไม่ใช่เดาจากตัวเลขซูม
 * เป้าหมาย: 1 pixel ของภาพ ≈ 1 pixel บนจอ (เกณฑ์เดียวกับที่ Leaflet ใช้)
 *   ระดับที่ต้องการ = log2(ความกว้างที่แสดงจริง / ความกว้างกรอบที่ระดับ 0)
 *
 * อ้างอิงคุณภาพ: PNG เดิมของ Labs/Labyrinth คือ 8192px ซึ่งเทียบเท่า z=5
 * ดังนั้นเพดาน tile ต้องเปิดให้ถึง z=5 เป็นอย่างน้อย ไม่งั้นภาพจะคมน้อยกว่าของเดิม
 */
export const pickTileLevel = (entry, displayedWidthPx, maxTiles = 1200) => {
  if (!hasSatellite(entry)) return null;
  const { minZoom, maxZoom } = entry.tile;
  const base = tileRect(entry, 0);
  if (!base || !base.width) return minZoom;

  const wanted = Math.round(Math.log2(Math.max(1, displayedWidthPx) / base.width));
  let level = Math.max(minZoom, Math.min(maxZoom, wanted));
  // ถอยระดับลงถ้าจำนวน tile บานปลาย (ยังคมพอเพราะ z=5 = ความละเอียดเท่า PNG เดิม)
  while (level > minZoom && tileCount(entry, level) > maxTiles) level -= 1;
  return level;
};

/** ระดับสูงสุดที่ยังอยู่ในโควตา — ใช้บอกผู้ใช้ว่าคมได้ถึงไหน */
export const maxUsableTileLevel = (entry, maxTiles = 1200) => {
  if (!hasSatellite(entry)) return null;
  const { minZoom, maxZoom } = entry.tile;
  let level = maxZoom;
  while (level > minZoom && tileCount(entry, level) > maxTiles) level -= 1;
  return level;
};

/**
 * รายการ tile ที่ต้องวาง พร้อมตำแหน่งเป็น % ของกรอบแมพ
 * view = ช่วงที่มองเห็นเป็นสัดส่วน 0..1 ({x0,x1,y0,y1}) ไว้ตัด tile ที่อยู่นอกจอ
 */
export const tilesFor = (entry, level, view) => {
  const rect = tileRect(entry, level);
  if (!rect) return [];
  const size = entry.tile.size || 256;
  const pad = 0.15;   // เผื่อขอบไว้หน่อย เวลาเลื่อนจะไม่เห็นช่องว่าง
  const vx0 = view ? Math.max(0, view.x0 - pad) : 0;
  const vx1 = view ? Math.min(1, view.x1 + pad) : 1;
  const vy0 = view ? Math.max(0, view.y0 - pad) : 0;
  const vy1 = view ? Math.min(1, view.y1 + pad) : 1;

  const out = [];
  const cols = [Math.floor(rect.left / size), Math.ceil((rect.left + rect.width) / size)];
  const rows = [Math.floor(rect.top / size), Math.ceil((rect.top + rect.height) / size)];
  for (let tx = cols[0]; tx < cols[1]; tx += 1) {
    for (let ty = rows[0]; ty < rows[1]; ty += 1) {
      const leftPct = ((tx * size) - rect.left) / rect.width;
      const topPct = ((ty * size) - rect.top) / rect.height;
      const wPct = size / rect.width;
      const hPct = size / rect.height;
      if (leftPct + wPct < vx0 || leftPct > vx1) continue;
      if (topPct + hPct < vy0 || topPct > vy1) continue;
      out.push({
        key: `${level}/${tx}/${ty}`,
        url: entry.tile.url.replace('{z}', level).replace('{x}', tx).replace('{y}', ty),
        leftPct: leftPct * 100,
        topPct: topPct * 100,
        widthPct: wPct * 100,
        heightPct: hPct * 100,
      });
    }
  }
  return out;
};
