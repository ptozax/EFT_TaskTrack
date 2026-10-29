/* =========================================================================
 * PanelUI.jsx
 * ชุด UI กลางของหน้า Kappa / Quest Tree — โทนเดียวกับ sidebar ของหน้า Map
 * (การ์ดพื้นน้ำเงินเข้มไล่เฉด, ขอบ #24324f, หัวข้อตัวใหญ่ uppercase ตัวหนา)
 *
 * แยกออกมาเพื่อให้สองหน้านี้หน้าตาตรงกันจริง ไม่ต้องก๊อป style ไปมา
 * ========================================================================= */
import React, { useEffect, useState } from 'react';
import { Icons, TRADER_THEMES } from './EftComponent.jsx';
import { MAX_LOYALTY, loyaltyLevelsFor } from './QuestComponent.jsx';

/**
 * ความสูงของ AppNavbar ที่เป็น sticky-top ของ bootstrap (z-index 1020)
 * header ของแต่ละหน้าถ้าตั้ง top:0 เหมือนกันจะเลื่อนไปมุดใต้ navbar แล้วโดนบัง
 * -> ต้องยึดที่ใต้ navbar พอดี และความสูงเปลี่ยนได้เวลาจอแคบ (เมนูพับ) เลยต้องวัดจริง
 */
export const useNavbarOffset = () => {
  const [top, setTop] = useState(0);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const el = document.querySelector('.navbar.sticky-top') || document.querySelector('.navbar');
    if (!el) return undefined;
    const update = () => setTop(Math.round(el.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);
  return top;
};

export const P = {
  bg: '#0b1222',
  cardBg: 'linear-gradient(180deg,#131f38 0%,#0e1830 100%)',
  panelBg: 'linear-gradient(180deg,#101b31 0%,#0d1729 100%)',
  border: '#24324f',
  borderSoft: '#1b2742',
  headBg: '#16223c',
  inputBg: '#0e1730',
  /* สี่ระดับความสว่างของตัวหนังสือ วัดด้วยอัตราคอนทราสต์เทียบพื้นที่เข้มที่สุด
     ที่มีตัวหนังสือวางอยู่จริง (#1e293b — เซลล์ตารางหน้า Ballistics):
       text 11.9 > muted 8.1 > label 6.3 > dim 5.1   ผ่าน WCAG AA (4.5) ทุกระดับ
     ของเดิม dim อยู่ที่ 3.1 และ label 4.4 ซึ่งต่ำกว่าเกณฑ์ — เป็นต้นเหตุที่อ่านแล้วรู้สึกมืด
     เพราะสองระดับนี้แบกตัวหนังสือรองเกือบทั้งแอป (ป้ายกำกับ ชิปที่ไม่ได้เลือก หมายเหตุ)
     ปรับให้สว่างขึ้นโดยคงโทนน้ำเงินเดิมไว้ ไม่ได้เปลี่ยนเป็นเทาล้วน */
  text: '#e2e8f0',
  muted: '#b0c1e1',
  dim: '#8999b0',
  label: '#9aabce',
  gold: '#eab308',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
};

/** หัวข้อเล็กตัวใหญ่ ใช้นำหน้าทุกกลุ่ม */
export const label = {
  fontSize: '12px', color: P.dim, textTransform: 'uppercase',
  letterSpacing: '.1em', fontWeight: 700,
};

export const card = {
  background: P.cardBg,
  border: `1px solid ${P.border}`,
  borderRadius: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
};

/** ปุ่มกลม ๆ แบบ chip — ใช้เป็นตัวกรองที่กดสลับได้ */
export const chip = (active, color = P.gold) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '7px 14px', borderRadius: '999px', cursor: 'pointer', userSelect: 'none',
  fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap',
  transition: 'all .15s ease',
  border: `1px solid ${active ? color : '#2a3550'}`,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : P.dim,
});

/** ป้ายสถานะเล็ก ๆ */
export const badge = (color = P.label) => ({
  fontSize: '11.5px', fontWeight: 800, letterSpacing: '.04em',
  padding: '3px 8px', borderRadius: '999px',
  background: `${color}1f`, color, whiteSpace: 'nowrap',
});

/* ชิปเทรดเดอร์ในแถวตัวกรอง — จุดสี + ชื่อ + Loyalty Level ที่ผู้เล่นกรอกไว้
 *
 * LL เป็นตัวตัดสินว่าเควสชุดไหนของเทรดเดอร์คนนั้นเปิดแล้ว แต่เดิมต้องเปิดแผง
 * Loyalty ถึงจะเห็นเลข -> ย้ายมาแปะที่ชื่อเทรดเดอร์ซึ่งเห็นอยู่ตลอด
 *
 * LL4 คือเต็มแล้ว ใช้มงกุฎแทนเลข (ไอคอนเดียวกับปุ่ม Loyalty ที่เปิดแผง)
 * เพราะสิ่งที่อยากรู้ตอนกวาดตาคือ "เหลือใครที่ยังดันต่อได้" ไม่ใช่เลขของแต่ละคน
 * รูปทรงต่างกันเลยแยกออกจากกันได้โดยไม่ต้องอ่านทีละตัว */
/* ปุ่มระดับกว้าง 24 เรียงห่างกัน 3 -> 4 ปุ่ม = 105px ซึ่งกว้างกว่าชิปชื่อสั้น ๆ
   (Ref, Fence) ถ้าไม่จองที่ไว้ก่อน พอเปิดโหมด Loyalty คอลัมน์จะถ่างออก
   แล้วดันชิปที่อยู่ถัดไปเลื่อนไปทางขวาทั้งแถว หาคนที่เล็งไว้ไม่เจอ
   จองไว้ตลอดทั้งตอนเปิดและปิด ชิปจึงอยู่กับที่ ขยับแค่ความสูง */
const pickerWidth = (n) => (n ? n * 24 + (n - 1) * 3 : 0);

export const TraderChip = ({ name, level = 1, active, onClick, onSetLevel }) => {
  const color = TRADER_THEMES[name]?.bg || P.label;
  const levels = loyaltyLevelsFor(name);
  const cap = levels.length || MAX_LOYALTY;
  const maxed = level >= cap;

  const tag = (
    <span
      style={{ ...chip(active, color), cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      title={`${name} — Loyalty Level ${level}${maxed ? ' (max)' : ''}`}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
      {name}
      {/* ทองคงที่ ไม่เปลี่ยนตามสถานะเลือก/ไม่เลือกของชิป — ป้ายนี้บอก LL
          ไม่ได้บอกว่าถูกกรองอยู่ไหม ถ้าเปลี่ยนสีตามด้วยจะอ่านปนกันสองเรื่อง
          (ทอง = Loyalty ทั้งแอป: ปุ่มเปิดโหมด, ปุ่มเลือกระดับ, ป้าย LL ในการ์ด) */}
      <span style={{
        ...badge(P.gold),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 20, padding: '2px 6px', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {maxed ? <Icons.Crown size={12} /> : level}
      </span>
    </span>
  );

  // เทรดเดอร์ที่มีระดับเดียว (Lightkeeper, Btr Driver) ไม่ต้องจองที่ ไม่มีปุ่มจะขึ้นอยู่แล้ว
  if (levels.length === 0) return tag;

  return (
    /* alignItems: center ไม่ใช่ stretch — ปล่อย stretch ชิปจะยืดเต็มคอลัมน์ที่จองไว้
       แล้วขนาดเม็ดชิปเปลี่ยนไปมาตอนสลับโหมด ซึ่งคือสิ่งที่พยายามเลี่ยงอยู่ */
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      minWidth: pickerWidth(levels.length),
    }}>
      {tag}
      {!onSetLevel ? null : (
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
        {levels.map((n) => (
          <button
            key={n}
            onClick={() => onSetLevel(n)}
            title={`Loyalty Level ${n}${n === cap ? ' (max)' : ''}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 22, borderRadius: 7, cursor: 'pointer',
              fontSize: 13, fontWeight: 800, lineHeight: 1,
              border: `1px solid ${n === level ? P.gold : '#2a3550'}`,
              background: n === level ? `${P.gold}26` : 'transparent',
              color: n === level ? P.gold : P.dim,
            }}
          >
            {/* ปุ่มสุดท้ายเป็นมงกุฎ ไม่ใช่เลข — ที่ที่ตั้งค่าคือที่ที่ผูกความหมาย
                "มงกุฎ = เต็มแล้ว" ให้ป้ายบนชิป และ "เต็ม" ของแต่ละคนไม่เท่ากัน
                (Fence เต็มที่ 2) มงกุฎจึงสื่อตรงกว่าเลข */}
            {n === cap ? <Icons.Crown size={12} /> : n}
          </button>
        ))}
      </div>
      )}
    </div>
  );
};

/* คำกำกับของที่ต้องพกไปวาง — "เอาไปกี่ชิ้น ทำอะไรกับมัน ที่ไหน" ในบรรทัดเดียว
   บอกจำนวนเสมอ แม้จะเป็น 1 เพราะคำถามตอนจัดของคือ "ต้องเตรียมกี่ชิ้น"
   การเว้นว่างไว้ให้เดาเอาว่าแปลว่าหนึ่งนั้นตอบไม่ตรงคำถาม
   kind มาจาก PLACE_KIND, spots/anyOf มาจาก questPlantItems */
export const placeNote = (it) => [
  `×${it.count}`,
  { mark: 'mark', plant: 'place', use: 'use' }[it.kind],
  // บอกจำนวนจุดด้วยเมื่อต้องเอาไปหลายชิ้น ไม่งั้นดูเหมือนตัวเลขมั่ว
  it.spots > 1 ? `${it.spots} spots` : null,
  it.anyOf ? 'any of these' : null,
  it.mapName,
].filter(Boolean).join(' · ');

export const input = {
  background: P.inputBg,
  border: `1px solid ${P.border}`,
  borderRadius: '10px',
  padding: '10px 12px 10px 38px',
  fontSize: '14.5px',
  color: P.text,
  outline: 'none',
  width: '100%',
};

/** แถบความคืบหน้า — บางแต่ชัด มีตัวเลขกำกับข้างนอกเสมอ */
export const Bar = ({ value, total, color = P.gold, height = 6 }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ width: '100%', height, background: '#1b2742', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: color, borderRadius: 999,
        transition: 'width .45s ease-out',
      }} />
    </div>
  );
};

/** วงแหวนความคืบหน้า ใช้ที่หัวหน้า Kappa */
export const Ring = ({ value, total, size = 74, stroke = 7, color = P.gold }) => {
  const pct = total > 0 ? value / total : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b2742" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}>
        <div style={{ fontSize: '19px', fontWeight: 900, color: P.text }}>{Math.round(pct * 100)}%</div>
      </div>
    </div>
  );
};

/** ช่องค้นหาพร้อมไอคอนและปุ่มล้าง */
export const SearchBox = ({ value, onChange, placeholder = 'Search...', width }) => (
  <div style={{ position: 'relative', flex: width ? undefined : 1, width, minWidth: '180px' }}>
    <span style={{
      position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
      color: P.dim, display: 'flex', pointerEvents: 'none',
    }}>
      <Icons.Crosshair size={17} />
    </span>
    <input
      style={input}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button
        onClick={() => onChange('')}
        title="Clear"
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: P.dim, cursor: 'pointer',
          display: 'flex', padding: 2,
        }}
      >
        <Icons.Close size={14} />
      </button>
    )}
  </div>
);

/** ปุ่มไอคอนสี่เหลี่ยมมุมมน ใช้กับชุดควบคุมซูม */
export const IconButton = ({ title, onClick, children, active }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 9, cursor: 'pointer',
      border: `1px solid ${active ? P.gold : P.border}`,
      background: active ? `${P.gold}22` : P.inputBg,
      color: active ? P.gold : P.muted,
      transition: 'all .15s ease',
    }}
  >
    {children}
  </button>
);

/** กล่องข้อความตอนไม่มีผลลัพธ์ */
export const Empty = ({ icon, title, hint }) => (
  <div style={{
    textAlign: 'center', padding: '64px 20px',
    border: `1px dashed ${P.border}`, borderRadius: 14,
    background: 'rgba(13,23,41,.5)',
  }}>
    <div style={{ color: P.dim, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: '17px', fontWeight: 700, color: P.muted }}>{title}</div>
    {hint && <div style={{ fontSize: '14.5px', color: P.dim, marginTop: 6 }}>{hint}</div>}
  </div>
);

/* สีพื้นตามระดับไอเทมของเกม (มากับข้อมูลในฟิลด์ item.backgroundColor) */
const ITEM_BG = {
  black: '#272727', blue: '#26343a', default: '#333333', green: '#1c2618',
  grey: '#2a2a2a', orange: '#49290f', red: '#4a1b1b', violet: '#372348', yellow: '#45402a',
};

/**
 * ป้ายกุญแจ — รูป + ชื่อ ใช้ร่วมกันทั้งหน้า Home และหน้า Map
 * ไม่ยึดกับพาเลตของหน้าไหน (ใช้สีโปร่งล้วน) เพราะสองหน้านี้พื้นหลังคนละโทน
 *
 * กดแล้วคัดลอก "ชื่อเต็ม" ลงคลิปบอร์ด เอาไปวางค้นในตลาดหรือในเกมต่อได้
 * (คัดลอกชื่อเต็มเสมอ ถึงป้ายจะโชว์ชื่อย่อก็ตาม — ชื่อย่อค้นไม่เจอ)
 *
 * @param compact  ย่อสำหรับป้ายหมุดบนแมพที่พื้นที่แคบ
 */
export const copyKeyName = (item, e) => {
  /* สำคัญบนแมพ: ป้ายหมุดมี onClick ที่สั่งปิดตัวเอง
     ถ้าไม่หยุด event ไว้ กดกุญแจทีป้ายก็ปิดไปด้วย */
  e?.stopPropagation?.();
  // คัดลอก "ชื่อเต็ม" เสมอ ถึงป้ายจะโชว์ชื่อย่อ — ชื่อย่อเอาไปค้นไม่เจอ
  // clipboard ไม่มีบน http หรือเบราว์เซอร์เก่า -> คืน false ไม่ให้หน้าเว็บพัง
  if (!globalThis.navigator?.clipboard) return Promise.resolve(false);
  return navigator.clipboard.writeText(item.name).then(() => true, () => false);
};

/* ใช้กับทั้งกุญแจและของที่ต้องพกไปวาง — `note` แทนบรรทัดล่างที่ปกติเป็นชื่อแมพ
   (ของที่พกไปวางอยากบอกทั้งจำนวนและวิธีใช้ ไม่ใช่แค่แมพ) */
export const KeyChip = ({ item, compact = false, showMap = false, note = null }) => {
  const px = compact ? 26 : 34;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = (e) => { copyKeyName(item, e).then((done) => done && setCopied(true)); };

  return (
    <span
      role="button"
      tabIndex={0}
      title={`${item.name} — คลิกเพื่อคัดลอกชื่อ`}
      onClick={copy}
      onMouseDown={(e) => e.stopPropagation()}   // กันลากแมพตามไปด้วย
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copy(e); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: compact ? 6 : 8,
        padding: compact ? '3px 8px 3px 3px' : '4px 10px 4px 4px',
        borderRadius: 9, maxWidth: '100%', cursor: 'pointer', userSelect: 'none',
        background: copied ? 'rgba(34,197,94,.18)' : 'rgba(148,163,184,.10)',
        border: `1px solid ${copied ? 'rgba(34,197,94,.65)' : 'rgba(148,163,184,.24)'}`,
        transition: 'background .15s ease, border-color .15s ease',
      }}
    >
      {/* ของเควส (plantQuestItem) ข้อมูลให้มาแค่ id กับชื่อ ไม่มีลิงก์รูป
          ปล่อยให้ <img> src ว่างจะได้ไอคอนรูปแตก -> วางกล่องเปล่าสีพื้นไอเทมแทน
          ขนาดเท่ากันทุกชิ้น แถวจึงไม่เหลื่อม */}
      {(item.gridImageLink || item.baseImageLink) ? (
        <img
          src={item.gridImageLink || item.baseImageLink}
          alt=""
          loading="lazy"
          style={{
            width: px, height: px, objectFit: 'contain', flexShrink: 0,
            borderRadius: 5, background: ITEM_BG[item.backgroundColor] || ITEM_BG.default,
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            width: px, height: px, flexShrink: 0, borderRadius: 5,
            background: ITEM_BG[item.backgroundColor] || ITEM_BG.default,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8999b0', fontSize: compact ? 13 : 16,
          }}
        >
          ?
        </span>
      )}
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: compact ? '12.5px' : '14px', fontWeight: 600,
          color: copied ? '#6ee7a8' : '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {/* ชื่อเต็มยาวมาก ("Health Resort west wing room 306 key") -> ป้ายแคบใช้ตัวย่อ */}
          {copied ? 'Copied!' : (compact ? (item.shortName || item.name) : item.name)}
        </span>
        {(note || (showMap && item.mapName)) && (
          <span style={{ display: 'block', fontSize: '11.5px', color: '#9aabce', marginTop: 1 }}>
            {note || item.mapName}
          </span>
        )}
      </span>
    </span>
  );
};
