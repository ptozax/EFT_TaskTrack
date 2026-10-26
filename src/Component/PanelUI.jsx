/* =========================================================================
 * PanelUI.jsx
 * ชุด UI กลางของหน้า Kappa / Quest Tree — โทนเดียวกับ sidebar ของหน้า Map
 * (การ์ดพื้นน้ำเงินเข้มไล่เฉด, ขอบ #24324f, หัวข้อตัวใหญ่ uppercase ตัวหนา)
 *
 * แยกออกมาเพื่อให้สองหน้านี้หน้าตาตรงกันจริง ไม่ต้องก๊อป style ไปมา
 * ========================================================================= */
import React, { useEffect, useState } from 'react';
import { Icons } from './EftComponent.jsx';

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
  text: '#e2e8f0',
  muted: '#9fb0d0',
  dim: '#64748b',
  label: '#7c8db0',
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

export const KeyChip = ({ item, compact = false, showMap = false }) => {
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
      <img
        src={item.gridImageLink || item.baseImageLink}
        alt=""
        loading="lazy"
        style={{
          width: px, height: px, objectFit: 'contain', flexShrink: 0,
          borderRadius: 5, background: ITEM_BG[item.backgroundColor] || ITEM_BG.default,
        }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: 'block', fontSize: compact ? '12.5px' : '14px', fontWeight: 600,
          color: copied ? '#6ee7a8' : '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {/* ชื่อเต็มยาวมาก ("Health Resort west wing room 306 key") -> ป้ายแคบใช้ตัวย่อ */}
          {copied ? 'Copied!' : (compact ? (item.shortName || item.name) : item.name)}
        </span>
        {showMap && item.mapName && (
          <span style={{ display: 'block', fontSize: '11.5px', color: '#7c8db0', marginTop: 1 }}>
            {item.mapName}
          </span>
        )}
      </span>
    </span>
  );
};
