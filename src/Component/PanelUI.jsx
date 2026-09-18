/* =========================================================================
 * PanelUI.jsx
 * ชุด UI กลางของหน้า Kappa / Quest Tree — โทนเดียวกับ sidebar ของหน้า Map
 * (การ์ดพื้นน้ำเงินเข้มไล่เฉด, ขอบ #24324f, หัวข้อตัวใหญ่ uppercase ตัวหนา)
 *
 * แยกออกมาเพื่อให้สองหน้านี้หน้าตาตรงกันจริง ไม่ต้องก๊อป style ไปมา
 * ========================================================================= */
import React from 'react';
import { Icons } from './EftComponent.jsx';

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
  fontSize: '10px', color: P.dim, textTransform: 'uppercase',
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
  padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', userSelect: 'none',
  fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
  transition: 'all .15s ease',
  border: `1px solid ${active ? color : '#2a3550'}`,
  background: active ? `${color}22` : 'transparent',
  color: active ? color : P.dim,
});

/** ป้ายสถานะเล็ก ๆ */
export const badge = (color = P.label) => ({
  fontSize: '10px', fontWeight: 800, letterSpacing: '.04em',
  padding: '2px 7px', borderRadius: '999px',
  background: `${color}1f`, color, whiteSpace: 'nowrap',
});

export const input = {
  background: P.inputBg,
  border: `1px solid ${P.border}`,
  borderRadius: '10px',
  padding: '9px 12px 9px 36px',
  fontSize: '13px',
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
        <div style={{ fontSize: '17px', fontWeight: 900, color: P.text }}>{Math.round(pct * 100)}%</div>
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
      <Icons.Crosshair size={15} />
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
    <div style={{ fontSize: '15px', fontWeight: 700, color: P.muted }}>{title}</div>
    {hint && <div style={{ fontSize: '13px', color: P.dim, marginTop: 6 }}>{hint}</div>}
  </div>
);
