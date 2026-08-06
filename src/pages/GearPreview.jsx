import React, { useState, useEffect, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Icons } from '../Component/EftComponent';
import { getData } from '../data/gameStore';

const DATA_URL = `${import.meta.env.BASE_URL}gear_data.json`;

const CATS = {
    all: { label: 'All', color: '#c7a34f' },
    rig: { label: 'Rigs', color: '#10b981' },
    'armored-rig': { label: 'Armored rigs', color: '#ef4444' },
    backpack: { label: 'Backpacks', color: '#3b82f6' },
    container: { label: 'Containers', color: '#eab308' },
    armor: { label: 'Body armor', color: '#f97316' },
};
const catColor = (c) => CATS[c]?.color || '#94a3b8';

const CELL = 38; // px per cell (ขนาดเท่ากันทุกไอเทม)

// one pocket (w x h cells) as a bordered box
const Pocket = ({ w, h, color, style }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${w}, 1fr)`,
        gridTemplateRows: `repeat(${h}, 1fr)`,
        gap: '2px', padding: '3px', boxSizing: 'border-box',
        background: '#0b1120', border: `1px solid ${color}`, borderRadius: '6px',
        ...style,
    }} title={`${w}×${h}`}>
        {Array.from({ length: w * h }).map((_, i) => (
            <div key={i} style={{ background: '#1e293b', border: '1px solid #2a3550', borderRadius: '3px' }} />
        ))}
    </div>
);

// real layout by row/col — absolute positioning (supports fractional col/row like 0.5)
const LayoutGrid = ({ layout, color, cell = CELL }) => {
    const cols = Math.max(...layout.map((g) => g.col + g.w));
    const rows = Math.max(...layout.map((g) => g.row + g.h));
    return (
        <div style={{ position: 'relative', width: `${cols * cell}px`, height: `${rows * cell}px` }}>
            {layout.map((pk, i) => (
                <Pocket
                    key={i}
                    w={pk.w}
                    h={pk.h}
                    color={color}
                    style={{
                        position: 'absolute',
                        left: `${pk.col * cell}px`,
                        top: `${pk.row * cell}px`,
                        width: `${pk.w * cell}px`,
                        height: `${pk.h * cell}px`,
                    }}
                />
            ))}
        </div>
    );
};

// one grid (w x h) as an inventory cell grid
const GridBox = ({ w, h, color, cell = CELL }) => (
    <div
        style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${w}, ${cell}px)`,
            gridTemplateRows: `repeat(${h}, ${cell}px)`,
            gap: '2px', padding: '3px', background: '#0b1120',
            border: `1px solid ${color}`, borderRadius: '6px',
        }}
        title={`${w}×${h}`}
    >
        {Array.from({ length: w * h }).map((_, i) => (
            <div key={i} style={{ background: '#1e293b', border: '1px solid #2a3550', borderRadius: '3px' }} />
        ))}
    </div>
);

const Penalty = ({ label, value }) => {
    if (value == null) return null;
    // raw value is a fraction (-0.01 = -1%) -> x100
    const pct = Math.round(value * 1000) / 10;
    return (
        <div className="d-flex justify-content-between" style={{ fontSize: '0.8rem' }}>
            <span className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '.05em' }}>{label}</span>
            <span style={{ color: pct < 0 ? '#ef4444' : pct > 0 ? '#22c55e' : '#94a3b8', fontWeight: 700 }}>{pct > 0 ? '+' : ''}{pct}%</span>
        </div>
    );
};

export default function GearPreview() {
    const [data, setData] = useState(null);
    const [loadErr, setLoadErr] = useState('');
    const [search, setSearch] = useState('');
    const [cat, setCat] = useState('all');
    const [selId, setSelId] = useState(null);

    useEffect(() => {
        let alive = true;
        getData('gear', DATA_URL) // live จาก tarkov.dev ก่อน, fallback ไฟล์ public
            .then((d) => { if (alive && d) setData(d); })
            .catch((e) => alive && setLoadErr(String(e)));
        return () => { alive = false; };
    }, []);

    const ITEMS = data?.items || [];

    const counts = useMemo(() => {
        const c = { all: ITEMS.length };
        ITEMS.forEach((it) => { c[it.category] = (c[it.category] || 0) + 1; });
        return c;
    }, [ITEMS]);

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        return ITEMS.filter((it) =>
            (cat === 'all' || it.category === cat) &&
            (!q || it.name.toLowerCase().includes(q) || (it.shortName || '').toLowerCase().includes(q))
        );
    }, [ITEMS, search, cat]);

    const selected = results.find((it) => it.id === selId) || results[0] || null;

    // จำนวนคอลัมน์ของ grid — ถ้ากว้างมาก (>=10 เช่น Junk Box / THICC 14x14) ให้จัดข้อมูลรูปบน/ข้อความล่าง
    const gridCols = selected
        ? (selected.layout?.length ? Math.max(...selected.layout.map((g) => g.col + g.w))
            : selected.grids?.length ? Math.max(...selected.grids.map((g) => g.w)) : 0)
        : 0;
    const bigGrid = gridCols >= 10;

    return (
        <div className="container py-4" style={{ maxWidth: '1280px' }}>
            <style>{`
                .gear-cell { background:#1a1a1a; border:1px solid #2e2e2e; border-radius:10px; transition:.15s; }
                .gear-cell.click:hover { border-color:#c7a34f; box-shadow:0 0 12px rgba(199,163,79,.25); transform:translateY(-2px); }
                .gear-slot { background:radial-gradient(circle at 50% 40%, #2a2a2a 0%, #141414 100%); border-radius:8px; }
            `}</style>

            <header className="mb-3 border-bottom border-secondary pb-1">
                <h1 className="display-6 fw-bold fst-italic mb-1">GEAR <span className="text-warning">PREVIEW</span></h1>
            </header>

            {/* category chips */}
            {data && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                    {Object.entries(CATS).map(([key, c]) => {
                        const active = cat === key;
                        const n = counts[key] || 0;
                        if (key !== 'all' && n === 0) return null;
                        return (
                            <button key={key} onClick={() => { setCat(key); setSelId(null); }}
                                className="btn btn-sm d-flex align-items-center gap-1"
                                style={{
                                    borderRadius: '20px', fontSize: '0.75rem',
                                    border: `1px solid ${c.color}`,
                                    background: active ? c.color : 'transparent',
                                    color: active ? '#000' : c.color, fontWeight: active ? 700 : 500,
                                }}>
                                {c.label}
                                <span className="badge" style={{ background: active ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)', color: active ? '#000' : '#aaa', fontSize: '0.6rem' }}>{n}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="input-group mb-3" style={{ maxWidth: '420px' }}>
                <span className="input-group-text bg-dark border-secondary text-warning"><Icons.Search size={16} /></span>
                <input className="form-control bg-dark text-light border-secondary" placeholder="Search gear..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>

            {loadErr && <div className="alert alert-danger py-2">Failed to load gear data: {loadErr}</div>}
            {!data && !loadErr && <div className="text-muted">Loading gear database ...</div>}

            {data && (
                <div className="row g-3">
                    {/* list */}
                    <div className="col-lg-4">
                        <div className="d-flex flex-column gap-2" style={{ maxHeight: '66vh', overflowY: 'auto' }}>
                            {results.map((it) => {
                                const active = selected?.id === it.id;
                                return (
                                    <div key={it.id} onClick={() => setSelId(it.id)}
                                        className="gear-cell click d-flex align-items-center gap-2 p-2"
                                        style={{ cursor: 'pointer', borderColor: active ? catColor(it.category) : undefined, background: active ? '#242424' : undefined }}>
                                        <div className="gear-slot d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '44px', height: '44px' }}>
                                            {it.icon && <img src={it.icon} alt="" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} onError={(e) => (e.target.style.display = 'none')} />}
                                        </div>
                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fw-bold text-light text-truncate" style={{ fontSize: '0.85rem' }}>{it.shortName || it.name}</div>
                                            <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.68rem' }}>
                                                <span style={{ color: catColor(it.category), textTransform: 'uppercase', letterSpacing: '.04em' }}>{CATS[it.category]?.label || it.category}</span>
                                                {it.armorClass ? <span className="badge bg-secondary">Class {it.armorClass}</span> : null}
                                                {it.capacity ? <span className="text-muted">{it.capacity} cells</span> : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {results.length === 0 && <div className="text-muted text-center py-4">No gear matches</div>}
                        </div>
                    </div>

                    {/* preview */}
                    <div className="col-lg-8">
                        {selected ? (
                            <div className="gear-cell p-3" style={{ borderColor: catColor(selected.category) }}>
                                <div className="d-flex flex-column flex-lg-row gap-4">

                                    {/* LEFT: storage grid (cells) */}
                                    <div className="order-2 order-lg-1" style={{ minWidth: 0 }}>
                                        <div className="text-uppercase text-muted mb-2" style={{ fontSize: '0.8rem', letterSpacing: '.1em' }}>
                                            Storage grids {selected.grids?.length ? `· ${selected.capacity} cells` : ''}
                                        </div>
                                        {selected.layout?.length ? (
                                            <LayoutGrid layout={selected.layout} color={catColor(selected.category)} />
                                        ) : selected.grids?.length ? (
                                            <div className="d-flex flex-wrap gap-2" style={{ maxWidth: `${CELL * 14 + 40}px` }}>
                                                {selected.grids.map((g, i) => <GridBox key={i} w={g.w} h={g.h} color={catColor(selected.category)} />)}
                                            </div>
                                        ) : (
                                            <div className="text-muted small fst-italic" style={{ maxWidth: '200px' }}>No internal storage (armor plate only)</div>
                                        )}
                                    </div>

                                    {/* RIGHT: item info + armor spec */}
                                    <div className={`order-1 order-lg-2 ${bigGrid ? 'flex-shrink-0' : 'flex-grow-1'}`} style={{ width: '210px', maxWidth: '100%' }}>
                                        {/* bigGrid (Junk/THICC): รูปบน/ข้อความล่าง · อื่น ๆ: รูปซ้าย/ข้อความขวา */}
                                        <div className={bigGrid ? '' : 'd-flex gap-3 mb-3'}>
                                            <div className="gear-slot d-flex align-items-center justify-content-center flex-shrink-0 mb-2" style={{ width: bigGrid ? '100%' : '120px', height: bigGrid ? '150px' : '120px' }}>
                                                {selected.image && <img src={selected.image} alt={selected.name} style={{ maxWidth: bigGrid ? '95%' : '112px', maxHeight: bigGrid ? '140px' : '112px', objectFit: 'contain' }} onError={(e) => (e.target.style.display = 'none')} />}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <span className="badge mb-1" style={{ background: catColor(selected.category), color: '#000' }}>{CATS[selected.category]?.label || selected.category}</span>
                                                <div className="fw-bold text-warning" style={{ fontSize: '1.4rem', lineHeight: 1.15 }}>{selected.shortName}</div>
                                                <div className="text-light" style={{ fontSize: '1rem' }}>{selected.name}</div>
                                                {selected.weight != null && <div className="text-muted small mt-1">{selected.weight} kg</div>}
                                            </div>
                                        </div>

                                        {(selected.armorClass || selected.zones?.length || selected.material) && (
                                            <div className="rounded p-2 mt-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                                                    {selected.armorClass ? <span className="badge bg-danger">Class {selected.armorClass}</span> : null}
                                                    {selected.material ? <span className="text-muted small">{selected.material}</span> : null}
                                                </div>
                                                {selected.zones?.length ? <div className="text-light small mb-2">Protects: {selected.zones.join(', ')}</div> : null}
                                                <Penalty label="Movement" value={selected.penalties?.speed} />
                                                <Penalty label="Turn" value={selected.penalties?.turn} />
                                                <Penalty label="Ergonomics" value={selected.penalties?.ergo} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-muted text-center py-5">Select an item to preview</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
