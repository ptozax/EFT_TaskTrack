import React, { useState, useMemo, useEffect, useRef } from 'react';
import ammoStatic from '../data/ammo.json';
import { useLiveData } from '../data/gameStore';
import { usePersisted } from '../Component/usePersisted';
import { AmmoStyles as styles, Icons } from '../Component/EftComponent';
import '../Component/ammo.css';

const CALIBER_KEY = 'eft_ammo_caliber';
const SORT_KEY = 'eft_ammo_sort';

/* ชื่อ caliber จาก tarkov.dev มาเป็น "Caliber556x45NATO" ซึ่งอ่านยาก
   แปลงด้วยตารางเทียบ ไม่ใช่ regex เพราะกฎไม่ตรงกัน:
   545 -> 5.45 (จุดหลังหลักแรก) แต่ 127 -> 12.7 (จุดหลังหลักที่สอง)
   และหลายตัวในเกมเรียกด้วยชื่อนิ้วแทนมิลลิเมตร (1143x23ACP = .45 ACP) */
const CALIBER_LABEL = {
    Caliber12g: '12/70', Caliber20g: '20/70', Caliber23x75: '23x75mm',
    Caliber9x18PM: '9x18', Caliber9x19PARA: '9x19', Caliber9x21: '9x21',
    Caliber9x39: '9x39', Caliber9x33R: '.357', Caliber545x39: '5.45x39',
    Caliber556x45NATO: '5.56x45', Caliber57x28: '5.7x28', Caliber58x42: '5.8x42',
    Caliber46x30: '4.6x30', Caliber68x51: '6.8x51', Caliber762x25TT: '7.62x25',
    Caliber762x35: '.300 BLK', Caliber762x39: '7.62x39', Caliber762x51: '7.62x51',
    Caliber762x54R: '7.62x54R', Caliber784x49: '7.84x49', Caliber86x70: '.338',
    Caliber93x64: '9.3x64', Caliber127x33: '.50 AE', Caliber127x55: '12.7x55',
    Caliber127x99: '12.7x99', Caliber1143x23ACP: '.45 ACP', Caliber366TKM: '.366',
    Caliber26x75: '26x75', Caliber40x46: '40x46', Caliber40mmRU: '40mm RU',
    Caliber20x1mm: '20x1mm',
};
const caliberLabel = (c) => CALIBER_LABEL[c] || String(c || '').replace('Caliber', '');

/* --- เกณฑ์ประสิทธิภาพต่อเกราะ (เหมือนเดิม ไม่ได้แก้สูตร) ---
   เทียบ penetrationPower กับ armorClass x 10 แล้วไล่ลงทีละ 5 แต้ม
   เช่น เกราะ class 4 ต้องการ pen 40 ขึ้นไปถึงได้ 6 คะแนน */
const getEffectivenessScore = (pen, armorClass) => {
    const target = armorClass * 10;
    if (pen >= target) return 6;
    if (pen >= target - 5) return 5;
    if (pen >= target - 10) return 4;
    if (pen >= target - 15) return 3;
    if (pen >= target - 20) return 2;
    if (pen >= target - 25) return 1;
    return 0;
};

/* ไล่สีแดง -> ส้ม -> เหลือง -> เขียว ให้ "สูงกว่า = ดีกว่า" อ่านได้จากสีอย่างเดียว
   ของเดิมใช้สีล้วน (#00FF00 / #FFFF00 / #FF0000) ซึ่งแสบตาและ 5 สว่างกว่า 6
   label ใช้ทั้งในแถบคำอธิบายและใน title ของทุกช่อง (ชี้เมาส์แล้วอ่านได้เลย) */
const EFFECT = [
    { bg: '#1b2740', fg: '#64748b', label: 'Pointless' },
    { bg: '#7f1d1d', fg: '#fecaca', label: 'Last resort' },
    { bg: '#ef4444', fg: '#ffffff', label: 'Magdump only' },
    { bg: '#fb923c', fg: '#1c1917', label: 'Slightly effective' },
    { bg: '#fde047', fg: '#1c1917', label: 'Effective' },
    { bg: '#a3e635', fg: '#1a2e05', label: 'Very effective' },
    { bg: '#4ade80', fg: '#052e16', label: 'Usually ignores armor' },
];

const scoreBox = (score, size = 26) => ({
    width: size,
    height: size,
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size > 22 ? '0.8rem' : '0.65rem',
    fontWeight: 700,
    margin: '0 auto',
    backgroundColor: EFFECT[score].bg,
    color: EFFECT[score].fg,
});

const ARMOR_CLASSES = [1, 2, 3, 4, 5, 6];

/* แถบคำอธิบายคะแนน — บรรทัดเดียว โชว์ค้างไว้ ไม่มีปุ่มเปิด/ปิด
   ของเดิมเป็นกล่อง 7 ช่องที่กินที่จนต้องมีปุ่มซ่อน แต่พอซ่อนแล้วตัวเลขในตารางก็อ่านไม่ออก */
const Legend = () => (
    <div style={styles.legendStrip}>
        <span style={{ ...styles.legendItem, color: '#cbd5e1', fontWeight: 700 }}>
            <Icons.HelpCircle size={13} /> Score
        </span>
        {[6, 5, 4, 3, 2, 1, 0].map((s) => (
            <span key={s} style={styles.legendItem}>
                <span style={{ ...styles.legendSwatch, backgroundColor: EFFECT[s].bg, color: EFFECT[s].fg }}>{s}</span>
                {EFFECT[s].label}
            </span>
        ))}
    </div>
);

const Modal = ({ item, onClose }) => {
    // ปิดด้วย Esc — ของเดิมปิดได้ทางเดียวคือเล็งปุ่มกากบาทมุมขวาบน
    useEffect(() => {
        if (!item) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [item, onClose]);

    if (!item) return null;

    const scores = ARMOR_CLASSES.map((ac) => getEffectivenessScore(item.penetrationPower, ac));

    return (
        // คลิกฉากหลังเพื่อปิด แต่คลิกในกล่องต้องไม่ปิด
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeButton} aria-label="Close">
                    <Icons.Cross size={24} />
                </button>

                <div style={styles.modalBody}>
                    <div style={styles.modalHeader}>
                        <div style={styles.modalImageContainer}>
                            <img
                                src={item.item.image512pxLink}
                                alt={item.item.name}
                                style={{ width: '8rem', height: '8rem', objectFit: 'contain' }}
                                onError={(e) => { e.target.src = item.item.imageLink; }}
                            />
                        </div>
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem', margin: 0 }}>{item.item.name}</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={styles.pill}>{caliberLabel(item.caliber)}</span>
                                <span style={styles.pill}>{item.ammoType}</span>
                                {item.tracer && (
                                    <span style={styles.tracerPill}>
                                        <Icons.Crosshair size={12} /> Tracer ({item.tracerColor})
                                    </span>
                                )}
                            </div>

                            {/* เห็นผลต่อเกราะได้โดยไม่ต้องปิดหน้าต่างกลับไปดูตาราง */}
                            <div style={styles.modalArmorRow}>
                                {scores.map((score, i) => (
                                    <div key={i} style={styles.modalArmorCell} title={EFFECT[score].label}>
                                        <div style={scoreBox(score, 24)}>{score}</div>
                                        <span>Cl.{ARMOR_CLASSES[i]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <h3 style={styles.sectionTitle}>
                                <Icons.ShieldAlert size={18} style={{ color: '#eab308' }} /> Ballistics
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Damage</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f87171' }}>{item.damage}</div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Penetration</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#a3e635' }}>{item.penetrationPower}</div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Armor Dmg</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fb923c' }}>{item.armorDamage}%</div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Speed</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#34d399' }}>{item.initialSpeed} m/s</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={styles.sectionTitle}>
                                <Icons.Zap size={18} style={{ color: '#facc15' }} /> Weapon Effects
                            </h3>
                            <div style={{ ...styles.statBox, backgroundColor: 'rgba(39, 39, 42, 0.2)', border: '1px solid #27272a' }}>
                                <div style={styles.statRow}>
                                    <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Accuracy</span>
                                    <span style={{ fontFamily: 'monospace', color: item.accuracy > 0 ? "#4ade80" : item.accuracy < 0 ? "#f87171" : "#71717a" }}>
                                        {item.accuracy > 0 ? '+' : ''}{item.accuracy}%
                                    </span>
                                </div>
                                <div style={styles.statRow}>
                                    <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Recoil</span>
                                    <span style={{ fontFamily: 'monospace', color: item.recoil > 0 ? "#f87171" : item.recoil < 0 ? "#4ade80" : "#71717a" }}>
                                        {item.recoil > 0 ? '+' : ''}{item.recoil}
                                    </span>
                                </div>
                                <div style={styles.statRow}>
                                    <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Frag Chance</span>
                                    <span style={{ color: '#d4d4d8', fontFamily: 'monospace' }}>{Math.round(item.fragmentationChance * 100)}%</span>
                                </div>
                                <div style={{ ...styles.statRow, borderBottom: 'none' }}>
                                    <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Ricochet</span>
                                    <span style={{ color: '#d4d4d8', fontFamily: 'monospace' }}>{Math.round(item.ricochetChance * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                            <div style={{ color: '#71717a' }}>Light Bleed: <span style={{ color: '#d4d4d8', fontWeight: '700', marginLeft: '0.25rem' }}>{(item.lightBleedModifier * 100).toFixed(0)}%</span></div>
                            <div style={{ color: '#71717a' }}>Heavy Bleed: <span style={{ color: '#d4d4d8', fontWeight: '700', marginLeft: '0.25rem' }}>{(item.heavyBleedModifier * 100).toFixed(0)}%</span></div>
                            <div style={{ color: '#71717a' }}>Stack Size: <span style={{ color: '#d4d4d8', fontWeight: '700', marginLeft: '0.25rem' }}>{item.stackMaxSize}</span></div>
                            <div style={{ color: '#71717a' }}>Weight: <span style={{ color: '#d4d4d8', fontWeight: '700', marginLeft: '0.25rem' }}>{item.weight}kg</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Ammo = () => {
    const ammo = useLiveData(ammoStatic, 'ammo'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCaliber, setSelectedCaliber] = usePersisted(CALIBER_KEY, 'All');
    const [sortConfig, setSortConfig] = usePersisted(SORT_KEY, { key: 'penetrationPower', direction: 'desc' });
    const [selectedItem, setSelectedItem] = useState(null);

    const rootRef = useRef(null);
    const headerRef = useRef(null);

    /* วางของหนึบสามชั้นให้ไม่ทับกัน: navbar -> header ของหน้า -> หัวตาราง
       ทั้ง navbar (react-bootstrap sticky="top") และ header ของหน้าตั้ง top: 0 เหมือนกัน
       ถ้าปล่อยไว้ header จะมุดใต้ navbar ตอนเลื่อน (navbar z-index 1020)
       ความสูงทั้งคู่ไม่คงที่ — navbar ยุบบนจอแคบ ส่วน header สูงขึ้นเมื่อช่องค้นหาตกบรรทัด
       เลยวัดจริงแล้วเขียนลง CSS var (เขียนลง style ตรง ๆ ไม่ผ่าน state จะได้ไม่ re-render 200 แถว) */
    useEffect(() => {
        const root = rootRef.current;
        const head = headerRef.current;
        if (!root || !head) return undefined;
        const nav = document.querySelector('nav.navbar');
        const apply = () => {
            const navH = nav ? nav.offsetHeight : 0;
            root.style.setProperty('--ammo-nav', `${navH}px`);
            root.style.setProperty('--ammo-top', `${navH + head.offsetHeight}px`);
        };
        apply();
        const ro = new ResizeObserver(apply);
        ro.observe(head);
        if (nav) ro.observe(nav);
        return () => ro.disconnect();
    }, []);

    // ammo มาจาก useLiveData -> สลับ static เป็นสดได้ระหว่างอยู่หน้านี้ ต้องอยู่ใน deps
    const searched = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return ammo;
        return ammo.filter((it) =>
            it.item.name.toLowerCase().includes(q) ||
            it.item.normalizedName.toLowerCase().includes(q) ||
            caliberLabel(it.caliber).toLowerCase().includes(q)
        );
    }, [ammo, searchTerm]);

    /* นับจำนวนหลังกรองคำค้นแต่ก่อนกรอง caliber — ตัวเลขบนชิปจะได้บอกตรง ๆ
       ว่ากดแล้วจะเหลือกี่นัด ไม่ใช่ตัวเลขรวมที่ไม่เกี่ยวกับสิ่งที่ค้นอยู่ */
    const calibers = useMemo(() => {
        const count = {};
        searched.forEach((it) => { count[it.caliber] = (count[it.caliber] || 0) + 1; });
        const list = Object.keys(count)
            .map((value) => ({ value, label: caliberLabel(value), count: count[value] }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        return [{ value: 'All', label: 'All', count: searched.length }, ...list];
    }, [searched]);

    // caliber ที่จำไว้อาจไม่มีอยู่แล้วหลังข้อมูลอัปเดต -> ตกกลับไป All ไม่งั้นตารางว่างแบบงง ๆ
    const activeCaliber = calibers.some((c) => c.value === selectedCaliber) ? selectedCaliber : 'All';

    // เปลี่ยนตัวกรองแล้วเลื่อนกลับขึ้นบนสุด ไม่งั้นค้างอยู่กลางลิสต์ของชุดเดิม
    // (ตัวกรองอยู่ใน header ที่หนึบ เลยยังกดได้ตอนเลื่อนลงไปลึก ๆ)
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [activeCaliber, searchTerm]);

    const filteredData = useMemo(() => {
        let data = activeCaliber === 'All' ? [...searched] : searched.filter((it) => it.caliber === activeCaliber);

        if (sortConfig.key) {
            const byName = sortConfig.key.includes('.');
            data.sort((a, b) => {
                const aValue = byName ? a.item.name : a[sortConfig.key];
                const bValue = byName ? b.item.name : b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [searched, activeCaliber, sortConfig]);

    const handleSort = (key) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    const isFiltered = activeCaliber !== 'All' || searchTerm.trim() !== '';
    const resetFilters = () => { setSelectedCaliber('All'); setSearchTerm(''); };

    /* ลูกศรเรียงลำดับโชว์ตลอด แค่จาง ๆ ตอนไม่ได้ใช้
       ของเดิมตั้ง opacity: 0 ทำให้ไม่มีอะไรบอกเลยว่าหัวคอลัมน์กดได้ */
    const SortableTh = ({ column, label, style }) => {
        const active = sortConfig.key === column;
        return (
            <th
                style={{ ...styles.th, ...style, cursor: 'pointer', color: active ? '#eab308' : '#94a3b8' }}
                onClick={() => handleSort(column)}
                title={`Sort by ${label}`}
            >
                {label}
                <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, display: 'inline-block', verticalAlign: 'middle' }}>
                    {active && sortConfig.direction === 'asc' ? <Icons.ChevronUp size={13} /> : <Icons.ChevronDown size={13} />}
                </span>
            </th>
        );
    };

    return (
        <div className="ammo-page" style={styles.container} ref={rootRef}>
            <header className="ammo-head-bar" style={styles.header} ref={headerRef}>
                <div style={styles.headerInner}>
                    <div style={styles.headerTop}>
                        <div style={styles.logoSection}>
                            <div style={styles.logoIcon}>
                                <Icons.Crosshair size={20} />
                            </div>
                            <div>
                                <h1 style={styles.title}>Ballistics</h1>
                                <p style={styles.subtitle}>{ammo.length} rounds · penetration vs armor class</p>
                            </div>
                        </div>

                        <div style={styles.searchContainer}>
                            <div style={styles.searchIcon}><Icons.Search size={15} /></div>
                            <input
                                type="text"
                                placeholder="Search ammo or caliber..."
                                style={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={(e) => { e.target.style.borderColor = '#eab308'; e.target.style.boxShadow = '0 0 0 2px rgba(234, 179, 8, 0.18)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#2b3a52'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    {/* ชิปแทน dropdown — เห็นทุก caliber พร้อมจำนวน กดทีเดียวเปลี่ยนได้
                        เลื่อนแนวนอนแทนตกบรรทัด เพื่อให้ header สูงคงที่ หัวตารางจะได้ไม่ขยับ */}
                    <div className="ammo-chips">
                        {calibers.map((c) => (
                            <button
                                key={c.value}
                                style={styles.chip(c.value === activeCaliber)}
                                onClick={() => setSelectedCaliber(c.value)}
                            >
                                {c.label}
                                <span style={styles.chipCount}>{c.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main style={styles.main}>
                <Legend />

                <div style={styles.summaryBar}>
                    <span>
                        Showing <strong style={{ color: '#cbd5e1' }}>{filteredData.length}</strong> of {ammo.length}
                        {activeCaliber !== 'All' && <> · {caliberLabel(activeCaliber)}</>}
                    </span>
                    {isFiltered && (
                        <button style={styles.resetButton} onClick={resetFilters}>
                            <Icons.RotateCcw size={12} /> Clear filters
                        </button>
                    )}
                </div>

                {/* ไม่มีผลลัพธ์ -> ไม่ต้องกางกล่องตารางเปล่าสูง 320px ค้างไว้ */}
                {filteredData.length === 0 ? (
                    <div style={{ ...styles.tableContainer, padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ marginBottom: 10 }}>
                            No ammo matches {searchTerm.trim() && <>“{searchTerm.trim()}”</>}
                            {activeCaliber !== 'All' && ` in ${caliberLabel(activeCaliber)}`}.
                        </div>
                        <button style={{ ...styles.resetButton, margin: '0 auto' }} onClick={resetFilters}>
                            <Icons.RotateCcw size={12} /> Clear filters
                        </button>
                    </div>
                ) : (
                    /* ไม่มีกล่องครอบ — ขอบและมุมมนอยู่ที่ตัวเซลล์ใน ammo.css
                       ถ้ามีกล่องที่มีพื้นหลังอยู่ข้างหลัง สีกล่องจะถมรอยเว้าของมุมมน
                       จนหัวตารางที่หนึบดูเป็นมุมฉาก */
                    <div className="ammo-scroll"><table className="ammo-table">
                            <thead>
                                {/* แถวคร่อม: บอกว่าเลข 1-6 คือ armor class ไม่ใช่เลขลอย ๆ */}
                                <tr className="ammo-grouprow">
                                    <th className="ammo-stick" />
                                    <th colSpan={3} />
                                    <th colSpan={6} style={styles.groupHeader}>Armor class</th>
                                    <th />
                                </tr>
                                <tr className="ammo-headrow">
                                    <SortableTh column="item.name" label="Ammo" style={{ minWidth: '15rem' }} />
                                    <SortableTh column="damage" label="Dmg" style={{ textAlign: 'center' }} />
                                    <SortableTh column="penetrationPower" label="Pen" style={{ textAlign: 'center' }} />
                                    <SortableTh column="armorDamage" label="Arm %" style={{ textAlign: 'center' }} />
                                    {ARMOR_CLASSES.map((ac) => (
                                        <th key={ac} className="ammo-armor-head" style={styles.armorHeader}>{ac}</th>
                                    ))}
                                    <th style={{ ...styles.th, width: '3rem' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => {
                                    const scores = ARMOR_CLASSES.map((ac) => getEffectivenessScore(item.penetrationPower, ac));

                                    return (
                                        <tr
                                            key={item.item.id}
                                            className="ammo-row"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <td style={styles.td} className="ammo-stick">
                                                <div style={styles.nameCell}>
                                                    <div style={styles.iconCell}>
                                                        <img src={item.item.iconLink} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 500, color: '#e4e4e7' }}>
                                                            {item.item.name}
                                                            {item.tracer && <span title={`Tracer (${item.tracerColor})`} style={{ marginLeft: 6, color: '#f87171' }}>●</span>}
                                                        </div>
                                                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
                                                            {caliberLabel(item.caliber)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td style={{ ...styles.td, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.damage}</td>
                                            <td style={{ ...styles.td, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{item.penetrationPower}</td>
                                            <td style={{ ...styles.td, textAlign: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>{item.armorDamage}%</td>

                                            {scores.map((score, index) => (
                                                <td
                                                    key={index}
                                                    className="ammo-score"
                                                    style={styles.td}
                                                    title={`Armor class ${ARMOR_CLASSES[index]} — ${EFFECT[score].label}`}
                                                >
                                                    <div style={scoreBox(score)}>{score}</div>
                                                </td>
                                            ))}

                                            {/* ของเดิมเป็นปุ่มที่ไม่มี onClick เลย — ตอนนี้กดแล้วเปิดจริง */}
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button
                                                    style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                                                    aria-label={`Details for ${item.item.name}`}
                                                >
                                                    <Icons.Info size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            <Modal item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>
    );
}

export default Ammo;
