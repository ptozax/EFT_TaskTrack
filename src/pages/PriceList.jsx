import React, { useState, useEffect, useMemo } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Icons, TRADER_THEMES } from '../Component/EftComponent';
import { getData } from '../data/gameStore';

const DATA_URL = `${import.meta.env.BASE_URL}price_data.json`;

const CURRENCY_SYMBOL = { RUB: '₽', USD: '$', EUR: '€' };
const money = (value, currency = 'RUB') =>
    value == null ? '—' : `${CURRENCY_SYMBOL[currency] || ''}${Math.round(value).toLocaleString('en-US')}`;

// ลำดับพ่อค้าแบบในเกม (โชว์เฉพาะที่มีของขายจริง)
const TRADER_ORDER = ['prapor', 'therapist', 'skier', 'peacekeeper', 'mechanic', 'ragman', 'jaeger', 'ref', 'fence', 'lightkeeper'];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const traderTheme = (source) => TRADER_THEMES[cap(source)] || null;

// ราคาซื้อของไอเทมตามพ่อค้าที่เลือก (sel: 'all' | 'flea' | ชื่อพ่อค้า)
const buyFor = (it, sel) => {
    if (sel === 'flea') return it.buyFlea ? { ...it.buyFlea, source: 'Flea Market', isFlea: true } : null;
    if (sel && sel !== 'all' && sel !== 'barter') {
        const o = (it.buys || []).find((b) => b.source === sel);
        return o ? { ...o, isFlea: false } : null;
    }
    // all: พ่อค้าถูกสุดก่อน ไม่มีค่อย Flea
    if ((it.buys || []).length) return { ...it.buys[0], isFlea: false };
    if (it.buyFlea) return { ...it.buyFlea, source: 'Flea Market', isFlea: true };
    return null;
};

const RENDER_LIMIT = 120;
const SORTS = { name: 'Name', priceAsc: 'Price ↑ (cheap)', priceDesc: 'Price ↓ (expensive)' };

export default function PriceList() {
    const [data, setData] = useState(null);
    const [loadErr, setLoadErr] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sel, setSel] = useState('all'); // 'all' | 'flea' | 'barter' | trader source
    const [llFilter, setLlFilter] = useState(null); // loyalty level filter (null=all) ใช้เมื่อเลือกพ่อค้า
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [page, setPage] = useState(0); // หน้าละ RENDER_LIMIT ชิ้น

    useEffect(() => {
        let alive = true;
        getData('price', DATA_URL) // live จาก tarkov.dev ก่อน, fallback ไฟล์ public
            .then((d) => { if (alive && d) setData(d); })
            .catch((e) => alive && setLoadErr(String(e)));
        return () => { alive = false; };
    }, []);

    const ITEMS = data?.items || [];

    // จำนวนไอเทมต่อพ่อค้า (+ flea + barter) สำหรับโชว์บน chip
    const counts = useMemo(() => {
        const c = { all: ITEMS.length, flea: 0, barter: 0 };
        ITEMS.forEach((it) => {
            (it.buys || []).forEach((b) => { c[b.source] = (c[b.source] || 0) + 1; });
            if (it.buyFlea) c.flea++;
            if ((it.barters || []).length) c.barter++;
        });
        return c;
    }, [ITEMS]);

    const traders = TRADER_ORDER.filter((t) => counts[t] > 0);

    // เลือกพ่อค้าเฉพาะคนอยู่ไหม (ไม่ใช่ all/flea/barter) + level ที่พ่อค้านั้นมี
    const isTraderSel = sel !== 'all' && sel !== 'flea' && sel !== 'barter';
    const traderLevels = useMemo(() => {
        if (!isTraderSel) return [];
        const s = new Set();
        ITEMS.forEach((it) => (it.buys || []).forEach((b) => { if (b.source === sel && b.level != null) s.add(b.level); }));
        return [...s].sort((a, b) => a - b);
    }, [ITEMS, sel, isTraderSel]);

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = ITEMS;
        if (q) list = list.filter((it) => it.name.toLowerCase().includes(q) || (it.shortName || '').toLowerCase().includes(q));
        if (sel === 'flea') list = list.filter((it) => it.buyFlea);
        else if (sel === 'barter') list = list.filter((it) => (it.barters || []).length);
        else if (sel !== 'all') list = list.filter((it) => (it.buys || []).some((b) => b.source === sel));

        // กรองตาม loyalty level (เฉพาะตอนเลือกพ่อค้า)
        if (isTraderSel && llFilter != null) {
            list = list.filter((it) => (it.buys || []).some((b) => b.source === sel && b.level === llFilter));
        }

        // กรองตามช่วงราคา (ราคาซื้อเทียบรูเบิลของ view ปัจจุบัน)
        const min = parseFloat(minPrice);
        const max = parseFloat(maxPrice);
        if (!isNaN(min) || !isNaN(max)) {
            list = list.filter((it) => {
                const p = buyFor(it, sel)?.priceRUB;
                if (p == null) return false;
                if (!isNaN(min) && p < min) return false;
                if (!isNaN(max) && p > max) return false;
                return true;
            });
        }

        const priceOf = (it) => buyFor(it, sel)?.priceRUB ?? Infinity;
        const sorted = [...list];
        if (sortKey === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortKey === 'priceAsc') sorted.sort((a, b) => priceOf(a) - priceOf(b));
        else if (sortKey === 'priceDesc') sorted.sort((a, b) => priceOf(b) - priceOf(a));
        return sorted;
    }, [ITEMS, search, sortKey, sel, isTraderSel, llFilter, minPrice, maxPrice]);

    const pageCount = Math.max(1, Math.ceil(results.length / RENDER_LIMIT));
    const curPage = Math.min(page, pageCount - 1);
    const shown = results.slice(curPage * RENDER_LIMIT, (curPage + 1) * RENDER_LIMIT);

    // กลับหน้าแรกเมื่อเงื่อนไขกรอง/ค้นหา/เรียง เปลี่ยน
    useEffect(() => { setPage(0); }, [search, sel, sortKey, llFilter, minPrice, maxPrice]);

    // ข้อมูลราคา/สีที่ใช้ร่วมกันทั้งมุมมอง grid และ list
    const computeItem = (it) => {
        const barters = it.barters || [];
        const inBarter = sel === 'barter';
        const buy = inBarter ? null : buyFor(it, sel);
        const theme = buy && !buy.isFlea ? traderTheme(buy.source) : null;
        const accent = buy?.isFlea ? '#dc3545' : (theme?.bg || '#c7a34f');
        return { barters, inBarter, buy, accent };
    };

    const Chip = ({ id, label, count, color }) => {
        const active = sel === id;
        return (
            <button
                onClick={() => { setSel(id); setLlFilter(null); }}
                className="btn btn-sm d-flex align-items-center gap-1"
                style={{
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    border: `1px solid ${color || '#555'}`,
                    background: active ? (color || '#c7a34f') : 'transparent',
                    color: active ? '#000' : (color || '#ccc'),
                    fontWeight: active ? 700 : 500,
                }}
            >
                {label}
                {count != null && <span className="badge" style={{ background: active ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)', color: active ? '#000' : '#aaa', fontSize: '0.6rem' }}>{count}</span>}
            </button>
        );
    };

    return (
        <div className="container py-5" style={{ maxWidth: '1200px' }}>
            <style>{`
                .trader-cell { background:#1a1a1a; border:1px solid #2e2e2e; border-radius:10px; transition:.15s; }
                .trader-cell:hover { border-color:#c7a34f; box-shadow:0 0 12px rgba(199,163,79,.25); transform:translateY(-2px); }
                .trader-slot { background:radial-gradient(circle at 50% 40%, #2a2a2a 0%, #141414 100%); border-radius:8px; }
                /* ซ่อนลูกศร spinner ของ number input ให้เห็นตัวเลขเต็ม */
                input[type=number]::-webkit-outer-spin-button,
                input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>

            <header className="mb-3 border-bottom border-secondary pb-3">
                <h1 className="display-6 fw-bold fst-italic mb-1">
                    TRADER <span className="text-warning">MARKET</span>
                </h1>
            </header>

            {/* trader chips */}
            {data && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                    <Chip id="all" label="All" count={counts.all} color="#c7a34f" />
                    {traders.map((t) => (
                        <Chip key={t} id={t} label={cap(t)} count={counts[t]} color={traderTheme(t)?.bg} />
                    ))}
                    <Chip id="flea" label="Flea" count={counts.flea} color="#dc3545" />
                    {counts.barter > 0 && <Chip id="barter" label="⇄ Barter" count={counts.barter} color="#0dcaf0" />}
                </div>
            )}

            {/* loyalty level sub-filter (โผล่เมื่อเลือกพ่อค้า) */}
            {data && isTraderSel && (
                <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                    <span className="text-muted small me-1">Loyalty:</span>
                    {[null, ...traderLevels].map((l) => {
                        const active = llFilter === l;
                        return (
                            <button
                                key={l == null ? 'all' : l}
                                onClick={() => setLlFilter(l)}
                                className="btn btn-sm"
                                style={{
                                    borderRadius: '16px', fontSize: '0.72rem',
                                    border: '1px solid #c7a34f',
                                    background: active ? '#c7a34f' : 'transparent',
                                    color: active ? '#000' : '#c7a34f',
                                    fontWeight: active ? 700 : 500,
                                }}
                            >
                                {l == null ? 'All' : `LL${l}`}
                            </button>
                        );
                    })}
                    {traderLevels.length === 0 && <span className="text-muted small fst-italic">(no level data — waiting for API)</span>}
                </div>
            )}

            {/* search + sort */}
            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <div className="input-group flex-grow-1" style={{ minWidth: '220px', maxWidth: '420px' }}>
                    <span className="input-group-text bg-dark border-secondary text-warning"><Icons.Search size={16} /></span>
                    <input
                        className="form-control bg-dark text-light border-secondary"
                        placeholder="🔍 Search item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <select
                    className="form-select bg-dark text-light border-secondary"
                    style={{ maxWidth: '190px' }}
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                >
                    {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                {/* ช่วงราคา (₽ เทียบรูเบิล) — รองรับหลักแสน/ล้าน */}
                <div className="input-group" style={{ width: 'auto' }}>
                    <span className="input-group-text bg-dark border-secondary text-warning">₽</span>
                    <input
                        type="number"
                        min="0"
                        className="form-control bg-dark text-light border-secondary"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        style={{ width: '130px' }}
                    />
                    <span className="input-group-text bg-dark border-secondary text-muted">–</span>
                    <input
                        type="number"
                        min="0"
                        className="form-control bg-dark text-light border-secondary"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        style={{ width: '130px' }}
                    />
                    {(minPrice || maxPrice) && (
                        <button className="btn btn-outline-secondary" title="Clear price range" onClick={() => { setMinPrice(''); setMaxPrice(''); }}>×</button>
                    )}
                </div>
            </div>

            {loadErr && <div className="alert alert-danger py-2">Failed to load price data: {loadErr}</div>}
            {!data && !loadErr && <div className="text-muted">Loading price database ...</div>}

            {data && (
                <>
                    <div className="d-flex justify-content-between align-items-center text-muted small mb-2 flex-wrap gap-2">
                        <span>
                            {results.length === 0 ? 'No items' :
                                `${(curPage * RENDER_LIMIT + 1).toLocaleString()}–${Math.min((curPage + 1) * RENDER_LIMIT, results.length).toLocaleString()} of ${results.length.toLocaleString()} items`}
                        </span>
                        {pageCount > 1 && (
                            <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-sm btn-outline-secondary" disabled={curPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
                                <span className="text-light">Page {curPage + 1} / {pageCount}</span>
                                <button className="btn btn-sm btn-outline-secondary" disabled={curPage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next →</button>
                            </div>
                        )}
                    </div>

                    <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-3">
                            {shown.map((it) => {
                                const { barters, inBarter, buy, accent } = computeItem(it);
                                if (!inBarter && !buy) return null;
                                return (
                                    <div key={it.id} className="col">
                                        <div className="trader-cell h-100 d-flex flex-column p-2">
                                            <div className="trader-slot d-flex align-items-center justify-content-center mb-2" style={{ height: '96px' }}>
                                                {it.icon && (
                                                    <img src={it.icon} alt="" style={{ maxHeight: '86px', maxWidth: '100%', objectFit: 'contain' }} onError={(e) => (e.target.style.display = 'none')} />
                                                )}
                                            </div>

                                            <div className="fw-bold text-light text-truncate" style={{ fontSize: '0.82rem' }} title={it.name}>
                                                {it.shortName || it.name}
                                            </div>
                                            <div className="text-muted text-truncate mb-2" style={{ fontSize: '0.68rem' }}>{it.name}</div>

                                            <div className="mt-auto">
                                                {inBarter ? (
                                                    barters.map((bt, i) => {
                                                        const bc = traderTheme(bt.trader)?.bg || '#0dcaf0';
                                                        return (
                                                            <div key={i} className="rounded px-2 py-1 mb-1" style={{ background: 'rgba(0,0,0,0.35)', borderLeft: `3px solid ${bc}` }}>
                                                                <div className="text-uppercase fw-bold mb-1" style={{ fontSize: '0.6rem', color: bc }}>
                                                                    {bt.trader} · LL{bt.level}
                                                                </div>
                                                                <div className="d-flex flex-wrap gap-2 align-items-center">
                                                                    {bt.requiredItems.map((r, j) => (
                                                                        <span key={j} className="d-flex align-items-center text-light" style={{ fontSize: '0.62rem' }} title={r.shortName}>
                                                                            {r.icon && <img src={r.icon} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} onError={(e) => (e.target.style.display = 'none')} />}
                                                                            <span className="ms-1">×{r.count}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <>
                                                        {!buy.isFlea && buy.currency !== 'RUB' && (
                                                            <div className="text-end text-muted" style={{ fontSize: '0.62rem' }}>≈ {money(buy.priceRUB)}</div>
                                                        )}
                                                        {sel === 'all' && !buy.isFlea && it.buyFlea && (
                                                            <div className="text-end text-danger" style={{ fontSize: '0.62rem' }}>flea {money(it.buyFlea.priceRUB)}</div>
                                                        )}
                                                        {barters.length > 0 && (
                                                            <div className="text-info" style={{ fontSize: '0.6rem' }} title="Has barter — open the ⇄ Barter tab">⇄ barter available</div>
                                                        )}
                                                        {buy.buyLimit != null && (
                                                            <div className="text-end text-secondary" style={{ fontSize: '0.6rem' }} title="Max you can buy per restock">🛒 max {buy.buyLimit}/restock</div>
                                                        )}
                                                        <div
                                                            className="rounded px-2 py-1 d-flex justify-content-between align-items-center"
                                                            style={{ background: 'rgba(0,0,0,0.35)', borderLeft: `3px solid ${accent}` }}
                                                        >
                                                            <span className="text-uppercase fw-bold text-truncate" style={{ fontSize: '0.6rem', color: accent, maxWidth: '60%' }} title={buy.source}>
                                                                {buy.isFlea ? 'FLEA' : `${buy.source}${buy.level ? ` · LL${buy.level}` : ''}`}
                                                            </span>
                                                            <span className="fw-bold text-light" style={{ fontSize: '0.85rem' }}>
                                                                {money(buy.price, buy.currency)}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                    {shown.length === 0 && <div className="text-center text-muted py-5">No item matches</div>}

                    {pageCount > 1 && (
                        <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
                            <button className="btn btn-sm btn-outline-secondary" disabled={curPage === 0}
                                onClick={() => { setPage((p) => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>← Prev</button>
                            <span className="text-light small">Page {curPage + 1} / {pageCount}</span>
                            <button className="btn btn-sm btn-outline-secondary" disabled={curPage >= pageCount - 1}
                                onClick={() => { setPage((p) => Math.min(pageCount - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
