import React, { useMemo, useState } from 'react';
import { Icons } from '../Component/EftComponent';
/* =========================================================================
 * ItemTracker — panel ใน sidebar ของ MapPage
 *   ค้น + เพิ่ม item เข้า watchlist (เก็บที่ MapPage/localStorage), toggle โชว์/ซ่อน, ลบ
 *   badge: 📍N (จุด fixed spawn บนแมพนี้) / 🎲 (สุ่ม/ไม่มีบนแมพนี้) + tag "Raid-only"
 * props:
 *   items    : [{id,name,shortName,gridImageLink,inspectImageLink,buyFor}]  (รายการทั้งหมด)
 *   loot     : { [mapId]: { [itemId]: [pos] } }
 *   mapId    : tarkov map id ปัจจุบัน (ผูกหมุด)
 *   mapName  : ชื่อแมพปัจจุบัน (โชว์ badge)
 *   tracked  : [{id, hidden}]
 *   onChange : (next) => void
 *   colorFor : (id) => css color   (ให้สี dot ตรงกับหมุดบนแผนที่)
 * ========================================================================= */

const box = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 10, marginTop: 8 };
const chip = (on) => ({
  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginTop: 6,
  background: on ? '#1e293b' : '#141c2b', border: '1px solid #24324a', opacity: on ? 1 : 0.55,
});

export default function ItemTracker({ items, loot, mapId, mapName, tracked, colorFor, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(true);       // หุบ/แสดงทั้ง panel

  const byId = useMemo(() => {
    const m = new Map();
    (items || []).forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  // จำนวนแมพที่ item นี้มี fixed spawn (ทั้งหมด)
  const mapsWithItem = useMemo(() => {
    const c = {};
    Object.values(loot || {}).forEach((mi) => Object.keys(mi).forEach((id) => { c[id] = (c[id] || 0) + 1; }));
    return c;
  }, [loot]);

  const trackedIds = new Set(tracked.map((t) => t.id));
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !items) return [];
    return items
      .filter((it) => !trackedIds.has(it.id) && ((it.name || '').toLowerCase().includes(s) || (it.shortName || '').toLowerCase().includes(s)))
      .slice(0, 25);
  }, [q, items, tracked]);

  const add = (id) => { onChange([...tracked, { id, hidden: false, expanded: false }]); setQ(''); };
  const remove = (id) => onChange(tracked.filter((t) => t.id !== id));
  const toggle = (id) => onChange(tracked.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t)));
  const toggleExpand = (id) => onChange(tracked.map((t) => (t.id === id ? { ...t, expanded: !t.expanded } : t)));

  const icon = (it) => it?.gridImageLink || it?.inspectImageLink || it?.baseImageLink || '';
  const hereCount = (id) => (loot?.[mapId]?.[id] || []).length;
  const raidOnly = (it) => !(it?.buyFor || []).length;

  /* หน้าตาหัวข้อ/กล่อง ให้ตรงกับ section อื่นในไซด์บาร์ที่ออกแบบใหม่ */
  const headStyle = {
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none',
    padding: '10px 12px', borderRadius: open ? '12px 12px 0 0' : '12px',
    background: open ? '#16223c' : '#111c33', border: '1px solid #24324f',
    fontSize: '11px', fontWeight: 800, color: '#9fb0d0',
    textTransform: 'uppercase', letterSpacing: '.1em',
  };
  const bodyStyle = {
    border: '1px solid #24324f', borderTop: 'none', borderRadius: '0 0 12px 12px',
    background: 'linear-gradient(180deg,#101b31 0%,#0d1729 100%)', padding: '12px',
  };

  return (
    <div style={{ marginBottom: '10px' }}>
      <div onClick={() => setOpen((o) => !o)} style={headStyle}>
        <span style={{ fontSize: '13px' }}>📦</span>
        <span style={{ flex: 1 }}>Item spawns</span>
        <span style={{
          fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '999px',
          background: tracked.length ? 'rgba(56,189,248,.12)' : 'rgba(124,141,176,.12)',
          color: tracked.length ? '#38bdf8' : '#7c8db0',
        }}>
          {tracked.length || 'none'}
        </span>
        <span style={{ color: '#64748b', display: 'flex' }}>{open ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}</span>
      </div>

      {open && (<div style={bodyStyle}>
        {/* search */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search item to track…"
          style={{ width: '100%', marginTop: '10px', padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', fontSize: 12 }}
        />
        {results.length > 0 && (
          <div style={{ ...box, maxHeight: 220, overflowY: 'auto' }}>
            {results.map((it) => (
              <div key={it.id} onClick={() => add(it.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 5, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {icon(it) && <img src={icon(it)} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {mapsWithItem[it.id]
                      ? `📍 ${mapsWithItem[it.id]} map${mapsWithItem[it.id] > 1 ? 's' : ''}`
                      : '— no spawn data'} {raidOnly(it) && '· raid-only'}
                  </div>
                </div>
                <span style={{ color: '#22c55e', fontSize: 16 }}>＋</span>
              </div>
            ))}
          </div>
        )}

        {/* watchlist */}
        {tracked.length === 0 ? (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>No items tracked — search above to add one</div>
        ) : (
          <div style={{ marginTop: 4 }}>
            {tracked.map((t) => {
              const it = byId.get(t.id);
              const here = hereCount(t.id);
              const canExpand = here > 0;               // ขยายจุดได้เฉพาะที่มีหมุดบนแมพนี้
              const isExp = canExpand && t.expanded;
              const c = colorFor(t.id);
              return (
                <div key={t.id}
                  style={{ ...chip(!t.hidden), border: isExp ? `1px solid ${c}` : '1px solid #24324a', cursor: canExpand ? 'pointer' : 'default' }}
                  onClick={() => canExpand && toggleExpand(t.id)}
                  title={!canExpand ? 'No spawn points on this map' : isExp ? 'Click to shrink the markers' : 'Click to enlarge the markers'}
                >
                  <span style={{ width: isExp ? 14 : 10, height: isExp ? 14 : 10, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: isExp ? `0 0 6px ${c}` : '0 0 3px #000', transition: 'all .12s' }} />
                  {icon(it) && <img src={icon(it)} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it?.name || t.id}</div>
                    <div style={{ fontSize: 10, color: here ? (isExp ? c : '#4ade80') : '#94a3b8' }}>
                      {/* ข้อมูลต้นทาง (lootLoose) ระบุจุดเกิดไว้แค่ 314 ไอเทม
                          ของอย่าง Bolts / Screw nuts / Salewa ดรอปตามพื้นในเกมจริงแต่ไม่มีในข้อมูล
                          จึงห้ามเขียนว่า "container only" เพราะไม่จริง */}
                      {here
                        ? `${isExp ? '🔍 zoomed · ' : ''}📍 ${here} spot${here > 1 ? 's' : ''} on ${mapName}`
                        : (mapsWithItem[t.id]
                          ? `none on ${mapName} · mapped on ${mapsWithItem[t.id]} other map${mapsWithItem[t.id] > 1 ? 's' : ''}`
                          : 'no spawn points in the data — can still drop as loose loot or from containers')}
                    </div>
                  </div>
                  <button title={t.hidden ? 'Show pins' : 'Hide pins'} onClick={(e) => { e.stopPropagation(); toggle(t.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: t.hidden ? '#64748b' : '#facc15' }}>
                    {t.hidden ? '🚫' : '👁'}
                  </button>
                  <button title="Remove" onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#ef4444', lineHeight: 1 }}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>)}
    </div>
  );
}
