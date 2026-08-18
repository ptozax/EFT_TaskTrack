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

  return (
    <section style={{
      background: 'linear-gradient(180deg,#131f38 0%,#0e1830 100%)',
      border: '1px solid #24324f',
      borderRadius: '14px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }}>
      <div onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: '11px', fontWeight: 800, color: '#7c8db0',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          display: 'flex', alignItems: 'center', gap: '8px',
          justifyContent: 'space-between', cursor: 'pointer'
        }}>
        <span>🎯 Item Tracker ({tracked.length})</span>
        <span style={{ color: '#7c8db0', display: 'flex' }}>{open ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}</span>
      </div>

      {open && (<>
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
                    {mapsWithItem[it.id] ? `📍 ${mapsWithItem[it.id]} map(s)` : '🎲 random loot'} {raidOnly(it) && '· raid-only'}
                  </div>
                </div>
                <span style={{ color: '#22c55e', fontSize: 16 }}>＋</span>
              </div>
            ))}
          </div>
        )}

        {/* watchlist */}
        {tracked.length === 0 ? (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>ยังไม่มี item ที่ track — ค้นด้านบนแล้วกดเพิ่ม</div>
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
                  title={!canExpand ? 'ไม่มีจุดบนแมพนี้' : isExp ? 'คลิกเพื่อย่อจุดบนแผนที่' : 'คลิกเพื่อขยายจุดบนแผนที่'}
                >
                  <span style={{ width: isExp ? 14 : 10, height: isExp ? 14 : 10, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: isExp ? `0 0 6px ${c}` : '0 0 3px #000', transition: 'all .12s' }} />
                  {icon(it) && <img src={icon(it)} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it?.name || t.id}</div>
                    <div style={{ fontSize: 10, color: here ? (isExp ? c : '#4ade80') : '#94a3b8' }}>
                      {here ? `${isExp ? '🔍 ขยาย · ' : ''}📍 ${here} จุดใน ${mapName}` : (mapsWithItem[t.id] ? `🎲 ไม่มีใน ${mapName} · มี ${mapsWithItem[t.id]} แมพ` : '🎲 สุ่มในกล่อง — raid only')}
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
      </>)}
    </section>
  );
}
