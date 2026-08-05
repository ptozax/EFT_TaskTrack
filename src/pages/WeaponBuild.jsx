import React, { useState, useEffect, useMemo } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import { Icons, hideoutStyles as styles, kappaStyles as styless, COLORS } from '../Component/EftComponent';
import { DATA_URL, exportCardImage, EDIT_BUILD_KEY } from './optimizerCore';

// ---- โหลด dataset (static JSON ที่ preprocess ไว้แล้ว) ครั้งเดียว แล้ว cache ----
// วิธีเดียวกับ WeaponOptimizer: ไม่ยิง API สด -> โหลดไว = ประกอบต้นไม้อะไหล่ในเครื่องด้วย id lookup
let DATASET = null;
let datasetPromise = null;
const loadDataset = () => {
    if (DATASET) return Promise.resolve(DATASET);
    if (!datasetPromise) {
        datasetPromise = fetch(DATA_URL)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((d) => {
                DATASET = d;
                return d;
            });
    }
    return datasetPromise;
};

// ---- ประกอบต้นไม้อะไหล่จาก dataset ให้มี shape เหมือนที่คอมโพเนนต์เดิมใช้ (จาก tarkov.dev) ----
// memoize ต่อ mod id: กันวนซ้ำ (cycle) + ไม่ระเบิดเป็น exponential (สร้างแต่ละ mod ครั้งเดียว)
const buildModResolver = (mods) => {
    const cache = new Map();
    const resolve = (id) => {
        if (cache.has(id)) return cache.get(id);
        const m = mods[id];
        if (!m) return null;
        const obj = {
            id: m.id,
            name: m.name,
            shortName: m.shortName,
            iconLink: m.icon,
            weight: m.weight,
            basePrice: m.price,
            buyFor: m.buyFor || [],
            conflictingItems: (m.conflicts || []).map((cid) => ({ id: cid })),
            properties: { ergonomics: m.ergo, recoil: m.recoil, accuracy: m.acc, moa: m.moa, slots: [] },
        };
        cache.set(id, obj); // ตั้ง cache ก่อน resolve slots เพื่อตัด cycle
        obj.properties.slots = (m.slots || []).map((s) => ({
            id: s.id,
            name: s.name,
            nameId: s.nameId,
            required: s.required,
            filters: { allowedItems: (s.allowed || []).map(resolve).filter(Boolean) },
        }));
        return obj;
    };
    return resolve;
};

// ประกอบปืน 1 กระบอกจาก dataset (shape เหมือนผลจาก tarkov.dev เดิม)
const buildWeapon = (gun, mods) => {
    if (!gun) return null;
    const resolve = buildModResolver(mods);
    return {
        id: gun.id,
        name: gun.name,
        shortName: gun.shortName,
        iconLink: gun.icon,
        gridImageLink: gun.image || gun.icon,
        basePrice: gun.price,
        buyFor: gun.buyFor || [],
        weight: gun.weight,
        properties: {
            caliber: gun.caliber,
            ergonomics: gun.ergo,
            defaultErgonomics: gun.ergo,
            recoilVertical: gun.recoilV,
            recoilHorizontal: gun.recoilH,
            defaultRecoilVertical: gun.recoilV,
            defaultRecoilHorizontal: gun.recoilH,
            fireRate: gun.fireRate,
            moa: gun.moa,
            slots: (gun.slots || []).map((s) => ({
                id: s.id,
                name: s.name,
                nameId: s.nameId,
                required: s.required,
                filters: { allowedItems: (s.allowed || []).map(resolve).filter(Boolean) },
            })),
        },
    };
};

// --- Helper Functions ---
// ฟังก์ชันช่วยดึงรายการของที่ใส่ได้ โดยใช้ reduce แทน flatMap เพื่อความเข้ากันได้
const getAllowedItems = (filters) => {
    if (!filters) return [];

    const allItems = filters.allowedItems;

    // ลบรายการซ้ำโดยใช้ Map (ใช้ ID เป็น key)
    const uniqueItemsMap = new Map();
    allItems.forEach(item => {
        if (item && item.id) {
            uniqueItemsMap.set(item.id, item);
        }
    });

    return Array.from(uniqueItemsMap.values());
};

// ฟอร์แมตราคาเป็นรูเบิล เช่น 12,345 ₽
const formatPrice = (value) => `₽ ${(value || 0).toLocaleString('en-US')}`;

// สัญลักษณ์สกุลเงินที่พ่อค้าใน Tarkov ใช้
const CURRENCY_SYMBOL = { RUB: '₽', USD: '$', EUR: '€' };
const formatMoney = (value, currency = 'RUB') =>
    `${CURRENCY_SYMBOL[currency] || ''}${(value || 0).toLocaleString('en-US')}`;

// เลือกออฟเฟอร์ที่ "ถูกที่สุด" จาก buyFor (เทียบด้วยราคาเป็นรูเบิล)
const getBestBuy = (item) => {
    const offers = (item?.buyFor || []).filter((o) => o && o.priceRUB > 0);
    if (offers.length === 0) return null;
    return offers.reduce((best, o) => (o.priceRUB < best.priceRUB ? o : best));
};

// ป้ายราคาต่อชิ้น: ราคาซื้อจริงในสกุลเงินของพ่อค้า (fallback เป็น basePrice ถ้าไม่มีที่ขาย)
// ถ้าเป็นสกุลอื่นที่ไม่ใช่รูเบิล จะมีวงเล็บค่าเทียบรูเบิลต่อท้าย เช่น $ 179 (≈ ₽ 25,442)
const itemBuyLabel = (item) => {
    const best = getBestBuy(item);
    if (best) {
        const label = formatMoney(best.price, best.currency);
        return best.currency !== 'RUB'
            ? `${label} (≈ ${formatMoney(best.priceRUB, 'RUB')})`
            : label;
    }
    if (item?.basePrice) return formatMoney(item.basePrice, 'RUB');
    return null;
};

// แปลงต้นไม้อะไหล่ที่ใส่ -> โครง picks (mod + slot + children) ให้การ์ดของ Optimizer วาดได้
const buildPicks = (slots, buildState) => {
    const picks = [];
    (slots || []).forEach((slot) => {
        const item = buildState[slot.id];
        if (!item) return;
        picks.push({
            slot: slot.name.replace('mod_', '').replace(/_/g, ' '),
            mod: {
                icon: item.iconLink,
                shortName: item.shortName,
                name: item.name,
                recoil: item.properties?.recoil || 0,
                ergo: item.properties?.ergonomics || 0,
                price: getBestBuy(item)?.priceRUB ?? item.basePrice ?? null,
            },
            children: buildPicks(item.properties?.slots, buildState),
        });
    });
    return picks;
};

// แปลงบิลด์ของ WeaponBuild -> shape B ที่ exportCardImage/buildCardDoc ต้องการ (การ์ด PNG แบบ Optimizer)
const buildCardData = (baseWeapon, buildState) => {
    const s = computeWeaponStats(baseWeapon, buildState);
    const picks = buildPicks(baseWeapon.properties?.slots, buildState);
    return {
        gun: {
            name: baseWeapon.name,
            shortName: baseWeapon.shortName,
            caliber: baseWeapon.properties?.caliber,
            image: baseWeapon.gridImageLink || baseWeapon.iconLink,
            icon: baseWeapon.iconLink,
        },
        objective: 'Custom build',
        baseErgo: Math.round(s.baseErgo),
        finalErgo: Math.round(s.ergonomics),
        baseRecV: s.baseVert,
        finalRecV: s.verticalRecoil,
        baseRecH: s.baseHoriz,
        finalRecH: s.horizontalRecoil,
        totalCost: s.totalPriceRUB,
        res: {
            recoilPct: s.recoilMod, // % รวม (ติดลบ = ลดแรงดีด) การ์ดจะโชว์ -X%
            cap: null,              // WeaponBuild ไม่ได้ track ความจุแม็ก -> โชว์ —
            picks,
        },
    };
};

// --- Components ---

// 1. ส่วนค้นหาปืน — กรองจาก list ในหน่วยความจำ (dataset โหลดไว้แล้ว) ทันที
const WeaponSearch = ({ guns, loadingData, onSelect, onBuildState }) => {
    const [term, setTerm] = useState('M4A1');
    const [open, setOpen] = useState(true); // เลือกปืนแล้วหุบเอง คลิกหัวการ์ดเพื่อค้นใหม่

    const results = useMemo(() => {
        const q = term.trim().toLowerCase();
        if (!q) return [];
        return guns
            .filter((g) => g.name.toLowerCase().includes(q) || (g.shortName || '').toLowerCase().includes(q))
            .slice(0, 12);
    }, [term, guns]);

    const pick = (weapon) => {
        onSelect(weapon);
        onBuildState({});
        setOpen(false); // หุบหลังเลือก
    };

    return (
        <div className="card bg-dark text-light border-secondary mb-4 shadow-sm">
            <div
                className="card-header border-secondary d-flex align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpen(!open)}
            >
                <h5 className="mb-0 text-warning d-flex align-items-center">
                    <Icons.Search className="me-2" size={20} /> Select Base Weapon
                </h5>
                <span className="ms-auto text-muted d-flex align-items-center">
                    {!open && <small className="me-2 fst-italic">click to search</small>}
                    {open ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}
                </span>
            </div>
            {open && (
            <div className="card-body">
                <div className="input-group mb-3">
                    <input
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="ex. M4A1, AK-74, GLOCK"
                        autoFocus
                    />
                </div>

                {loadingData && <div className="text-muted small mb-2">Loading weapon database ...</div>}
                {!loadingData && term.trim() && results.length === 0 && (
                    <div className="text-muted small mb-2">No weapon matches "{term}"</div>
                )}

                <div className="row g-2">
                    {results.map((weapon) => (
                        <div key={weapon.id} className="col-md-6">
                            <div
                                onClick={() => pick(weapon)}
                                className="card bg-secondary text-light h-100 border-0 pointer-cursor hover-effect"
                                style={{ cursor: 'pointer', transition: '0.2s' }}
                            >
                                <div className="card-body d-flex align-items-center p-2">
                                    <img
                                        src={weapon.icon}
                                        alt={weapon.shortName}
                                        className="me-3 rounded bg-dark p-1"
                                        style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                    />
                                    <div>
                                        <div className="fw-bold text-white">{weapon.name}</div>
                                        <small className="text-light opacity-75">{weapon.shortName}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}
        </div>
    );
};

const calTotalStats = (slotId, buildState, total = { weight: 0, ergo: 0, recoilMod: 0, accMod: 0, barrelMoa: null, priceRUB: 0, spend: {} }) => {
    const item = buildState[slotId];

    // 1. If no item is in this slot, return the current total accumulation
    if (!item) return total;

    // 2. Add Weight
    if (item.weight) total.weight += item.weight;

    // 2.5 Add Price — ใช้ราคาซื้อจริงที่ถูกสุด (เทียบรูเบิลเพื่อรวมยอด + แยกยอดตามสกุลเงิน)
    // spend[currency] = { amount: ยอดในสกุลนั้น, rub: ค่าเทียบรูเบิล }
    const addSpend = (currency, amount, rub) => {
        const e = total.spend[currency] || { amount: 0, rub: 0 };
        e.amount += amount;
        e.rub += rub;
        total.spend[currency] = e;
    };
    const best = getBestBuy(item);
    if (best) {
        total.priceRUB += best.priceRUB;
        addSpend(best.currency, best.price, best.priceRUB);
    } else if (item.basePrice) {
        total.priceRUB += item.basePrice;
        addSpend('RUB', item.basePrice, item.basePrice);
    }

    // 3. Add Mod Properties
    if (item.properties) {
        if (item.properties.ergonomics) {
            total.ergo += item.properties.ergonomics;
        }
        if (item.properties.recoil) {
            total.recoilMod += item.properties.recoil;
        }
        // barrel ที่ใส่จะ "แทน" ค่า centerOfImpact ฐานของปืน (MOA) — acc ของ barrel เองสะท้อนใน COI อยู่แล้ว
        // จึงไม่นับ accuracyModifier ของ barrel ซ้ำ (ยืนยันกับเกม: Hanson 13.7" COI 0.045 -> 1.55 MOA พอดี ไม่ลดด้วย acc 0.05)
        if (item.properties.moa != null) {
            total.barrelMoa = item.properties.moa;
        } else if (item.properties.accuracy) {
            total.accMod += item.properties.accuracy; // accuracyModifier ของมอดอื่น (บวก = แม่นขึ้น = MOA ลดลง)
        }

        // 4. Recursive Step: Check for slots ON this item (e.g., a handguard with rails)
        if (item.properties.slots) {
            item.properties.slots.forEach(slot => {
                // We pass the same 'total' object to accumulate values deep in the tree
                calTotalStats(slot.id, buildState, total);
            });
        }
    }

    return total;
};

// เก็บอะไหล่ที่ใส่จริงทั้งหมด (รวมอะไหล่ซ้อนอะไหล่) พร้อมชื่อ slot เพื่อเอาไปทำพรีวิว
const collectEquippedParts = (slots, buildState, acc = []) => {
    if (!slots) return acc;
    slots.forEach(slot => {
        const item = buildState[slot.id];
        if (item) {
            acc.push({ slotId: slot.id, slotName: slot.name, item });
            if (item.properties?.slots) {
                collectEquippedParts(item.properties.slots, buildState, acc);
            }
        }
    });
    return acc;
};

// --- Build Preview Component (เรียงชิ้นส่วนแบบแกลเลอรี) ---
const WeaponPreview = ({ baseWeapon, buildState, onClear }) => {
    const [open, setOpen] = useState(true);
    const [exporting, setExporting] = useState(false);
    const parts = useMemo(
        () => collectEquippedParts(baseWeapon?.properties?.slots, buildState),
        [baseWeapon, buildState]
    );

    if (!baseWeapon) return null;

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportCardImage(buildCardData(baseWeapon, buildState));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="card bg-dark border-secondary mb-4">
            <div
                className="card-header bg-black border-bottom border-secondary py-2 d-flex align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpen(!open)}
            >
                <h6 className="mb-0 text-white fw-bold small d-flex align-items-center">
                    <Icons.Component size={16} className="me-2 text-warning" /> BUILD PREVIEW
                </h6>
                <div className="ms-auto d-flex align-items-center gap-2">
                    {open && (
                        <>
                            <button
                                className="btn btn-sm btn-outline-warning py-0 px-2"
                                style={{ fontSize: '0.7rem' }}
                                disabled={exporting}
                                onClick={(e) => { e.stopPropagation(); handleExport(); }}
                            >
                                {exporting ? '...' : 'Export'}
                            </button>
                            <button
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                style={{ fontSize: '0.7rem' }}
                                disabled={parts.length === 0}
                                onClick={(e) => { e.stopPropagation(); onClear?.(); }}
                            >
                                Clear
                            </button>
                        </>
                    )}
                    <span className="badge bg-secondary">{parts.length} parts</span>
                    {open ? <Icons.ChevronUp size={16} className="text-muted" /> : <Icons.ChevronDown size={16} className="text-muted" />}
                </div>
            </div>
            {open && (
            <div className="card-body" style={{ backgroundColor: '#0d0d0d' }}>
                {/* ตัวปืนเปล่า */}
                <div className="text-center mb-3 pb-3 border-bottom border-secondary">
                    <img
                        src={baseWeapon.gridImageLink || baseWeapon.iconLink}
                        alt={baseWeapon.name}
                        className="img-fluid drop-shadow"
                        style={{ maxHeight: '150px', objectFit: 'contain' }}
                    />
                    <div className="text-warning fw-bold mt-2">{baseWeapon.shortName}</div>
                    <div className="text-muted small">{baseWeapon.name}</div>
                </div>

                {/* อะไหล่ที่ใส่ */}
                {parts.length > 0 ? (
                    <div className="row g-2">
                        {parts.map((p) => (
                            <div key={p.slotId} className="col-6 col-md-4 col-xl-3">
                                <div className="border border-secondary rounded p-2 h-100 text-center bg-black d-flex flex-column">
                                    <span className="badge bg-secondary mb-1 text-truncate w-100" style={{ fontSize: '0.6rem' }}>
                                        {p.slotName.replace('mod_', '').replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    <div className="d-flex align-items-center justify-content-center" style={{ height: '60px' }}>
                                        <img
                                            src={p.item.iconLink}
                                            alt={p.item.shortName}
                                            style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }}
                                            onError={(e) => (e.target.style.display = 'none')}
                                        />
                                    </div>
                                    <div className="text-light text-truncate small mt-1" style={{ fontSize: '0.7rem' }}>
                                        {p.item.shortName}
                                    </div>
                                    {itemBuyLabel(p.item) ? (
                                        <div className="text-warning mt-auto" style={{ fontSize: '0.65rem' }} title={getBestBuy(p.item)?.vendor?.name || 'Base price'}>
                                            {itemBuyLabel(p.item)}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted small py-3">
                        Equip parts on the right to preview the build
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

// คำนวณ stats ทั้งหมดของบิลด์ (ใช้ทั้งการ์ด WeaponStats และตอน export รูป)
const computeWeaponStats = (baseWeapon, buildState) => {
    if (!baseWeapon || !baseWeapon.properties) return null;

    let totalWeight = baseWeapon.weight || 0;
    const baseErgo = baseWeapon.properties.defaultErgonomics || baseWeapon.properties.ergonomics || 0;
    let totalErgo = baseErgo;
    let recoilMod = 0; // % reduction (negative value usually)
    let accMod = 0; // รวม accuracyModifier ของมอด (สัดส่วน; บวก = แม่นขึ้น)
    let barrelMoa = null; // MOA ฐานจาก barrel ที่ใส่ (centerOfImpact ของ barrel)
    let partsPriceRUB = 0; // ราคาอะไหล่รวม (เทียบรูเบิล)
    const spend = {}; // ยอดที่ต้องจ่ายจริง แยกตามสกุลเงิน เช่น { RUB: x, USD: y }

    // spend[currency] = { amount, rub } — ยอดจริงในสกุลนั้น + ค่าเทียบรูเบิล
    const addSpend = (currency, amount, rub) => {
        const e = spend[currency] || { amount: 0, rub: 0 };
        e.amount += amount;
        e.rub += rub;
        spend[currency] = e;
    };

    // ราคาตัวปืนเปล่า — ใช้ราคาซื้อจริงที่ถูกสุด (fallback basePrice)
    const baseBuy = getBestBuy(baseWeapon);
    const basePriceRUB = baseBuy ? baseBuy.priceRUB : (baseWeapon.basePrice || 0);
    if (baseBuy) {
        addSpend(baseBuy.currency, baseBuy.price, baseBuy.priceRUB);
    } else if (baseWeapon.basePrice) {
        addSpend('RUB', baseWeapon.basePrice, baseWeapon.basePrice);
    }

    baseWeapon.properties.slots.forEach(slot => {
        const total = calTotalStats(slot.id, buildState);
        totalWeight += total.weight;
        totalErgo += total.ergo;
        recoilMod += total.recoilMod;
        accMod += total.accMod;
        if (total.barrelMoa != null) barrelMoa = total.barrelMoa;
        partsPriceRUB += total.priceRUB;
        Object.entries(total.spend).forEach(([cur, v]) => addSpend(cur, v.amount, v.rub));
    });

    // --- Recoil Calculation Logic --- สูตร: Base Recoil * (1 + Sum of Mod Recoil %)
    const baseVert = baseWeapon.properties.defaultRecoilVertical || baseWeapon.properties.recoilVertical || 0;
    const baseHoriz = baseWeapon.properties.defaultRecoilHorizontal || baseWeapon.properties.recoilHorizontal || 0;
    const finalVert = Math.max(0, Math.round(baseVert * (1 + (recoilMod / 100))));
    const finalHoriz = Math.max(0, Math.round(baseHoriz * (1 + (recoilMod / 100))));

    // --- MOA (accuracy) --- barrel ที่ใส่แทนค่า centerOfImpact ฐาน (ไม่งั้นใช้ของปืน) แล้วคูณ accuracyModifier ของมอดอื่น
    // ค่าดิบใน data คือ centerOfImpact -> แปลงเป็น MOA ที่เกมแสดง: MOA = COI * 100 / 2.9089 (1 MOA = 2.9089cm @100m)
    // ยืนยันกับ wiki: barrel M4 14.5" COI 0.053 -> 1.82 MOA ตรงเป๊ะ
    // finalCOI = baseCOI * (1 - Σacc) ; acc บวก = แม่นขึ้น = MOA ลดลง
    const COI_TO_MOA = 100 / 2.9089;
    const toMoa = (coi) => (coi != null ? Number((coi * COI_TO_MOA).toFixed(2)) : null);
    const weaponMoa = baseWeapon.properties.moa;
    const baseCoi = barrelMoa != null ? barrelMoa : weaponMoa;
    const finalMoa = toMoa(baseCoi != null ? Math.max(0, baseCoi * (1 - accMod)) : null);

    return {
        weight: totalWeight.toFixed(3),
        ergonomics: Number(Math.max(0, totalErgo).toFixed(1)),
        verticalRecoil: finalVert,
        horizontalRecoil: finalHoriz,
        moa: finalMoa,
        baseMoa: toMoa(baseCoi), // อ้างอิง = MOA ฐาน (barrel) ก่อนใส่มอด accuracy -> ลูกศรโชว์ผลของมอด
        fireRate: baseWeapon.properties.fireRate || 0,
        basePriceRUB,
        partsPriceRUB,
        totalPriceRUB: basePriceRUB + partsPriceRUB,
        spend,
        caliber: baseWeapon.properties.caliber,
        // ค่า base ไว้ทำ delta ในการ์ด export
        baseErgo, baseVert, baseHoriz, recoilMod,
    };
};

// --- Stats Component (New) ---
const WeaponStats = ({ baseWeapon, buildState }) => {
    const stats = useMemo(() => computeWeaponStats(baseWeapon, buildState), [baseWeapon, buildState]);

    if (!stats) return null;

    const StatRow = ({ label, value, unit, icon: Icon, barColor = "bg-info", max = 100 }) => (
        <div className="mb-2">
            <div className="d-flex justify-content-between align-items-center mb-1 text-uppercase fw-bold small text-muted" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                <span className="d-flex align-items-center gap-2">
                    {Icon && <Icon size={12} />} {label}
                </span>
                <span className="text-light font-monospace">{value} <span className="text-secondary">{unit}</span></span>
            </div>
            <div className="progress" style={{ height: '6px', backgroundColor: '#222' }}>
                <div
                    className={`progress-bar ${barColor}`}
                    role="progressbar"
                    style={{ width: `${Math.min(100, (parseFloat(value) / max) * 100)}%` }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="card bg-dark border-secondary mb-3">
            <div className="card-header bg-black border-bottom border-secondary py-2">
                <h6 className="mb-0 text-white fw-bold small d-flex align-items-center">
                    <Icons.Activity size={16} className="me-2 text-warning" /> WEAPON STATISTICS
                </h6>
            </div>
            <div className="card-body p-3" style={{ backgroundColor: '#111' }}>
                <StatRow label="Ergonomics" value={stats.ergonomics} unit="" icon={Icons.Zap} barColor="bg-primary" max={100} />
                <StatRow label="Vertical Recoil" value={stats.verticalRecoil} unit="" icon={Icons.Activity} barColor="bg-danger" max={300} />
                <StatRow label="Horizontal Recoil" value={stats.horizontalRecoil} unit="" icon={Icons.Activity} barColor="bg-danger" max={600} />
                <StatRow label="Weight" value={stats.weight} unit="kg" icon={Icons.Weight} barColor="bg-secondary" max={10} />

                <div className="row mt-3 border-top border-secondary pt-3 g-2">
                    <div className="col-4">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Fire Rate</div>
                            <div className="fw-bold text-white">{stats.fireRate} <span className="small text-muted">rpm</span></div>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="p-2 bg-dark rounded border border-secondary text-center" title="Accuracy — lower MOA = tighter groups">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>MOA</div>
                            <div className="fw-bold text-white">
                                {stats.moa != null ? stats.moa : '—'}
                                {stats.moa != null && stats.baseMoa != null && stats.moa !== stats.baseMoa && (
                                    <span className="small ms-1" style={{ color: stats.moa < stats.baseMoa ? '#22c55e' : '#ef4444' }}>
                                        {stats.moa < stats.baseMoa ? '▼' : '▲'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Caliber</div>
                            <div className="fw-bold text-white small">{stats.caliber}</div>
                        </div>
                    </div>
                </div>

                <div className="row mt-2 border-top border-secondary pt-3 g-2">
                    <div className="col-6">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Base Weapon</div>
                            <div className="fw-bold text-white small">{formatPrice(stats.basePriceRUB)}</div>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Parts Total</div>
                            <div className="fw-bold text-white small">{formatPrice(stats.partsPriceRUB)}</div>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="p-2 bg-dark rounded border border-warning text-center">
                            <div className="text-warning small text-uppercase fw-bold" style={{ fontSize: '0.65rem' }}>Total Build Price (≈ RUB)</div>
                            <div className="fw-bold text-warning">{formatPrice(stats.totalPriceRUB)}</div>
                        </div>
                    </div>
                    {/* ยอดที่ต้องจ่ายจริง แยกตามสกุลเงินของพ่อค้า */}
                    {Object.keys(stats.spend).length > 0 && (
                        <div className="col-12">
                            <div className="p-2 bg-dark rounded border border-secondary">
                                <div className="text-muted small text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>You Need (by currency)</div>
                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                    {Object.entries(stats.spend).map(([cur, v]) => (
                                        <span key={cur} className="badge bg-black border border-secondary text-warning" style={{ fontSize: '0.8rem' }}>
                                            {formatMoney(v.amount, cur)}
                                            {cur !== 'RUB' && <span className="text-muted"> (≈ {formatMoney(v.rub, 'RUB')})</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 2. แสดง Slot ของปืน (Recursive)
const SlotBuilder = ({ slots, buildState, onEquip, depth = 0 }) => {
    if (!slots || slots.length === 0) return null;

    return (
        <div className="d-flex flex-column gap-2">
            {slots.map((slot) => {
                const equippedItem = buildState[slot.id];
                return (
                    <div key={slot.id}>
                        <SlotItem
                            slot={slot}
                            equippedItem={equippedItem}
                            onEquip={onEquip}
                            depth={depth}
                            buildState={buildState}
                        />
                        {equippedItem?.properties?.slots?.length > 0 && (
                            <div className="ms-4 ps-3 border-start border-secondary mt-2 position-relative">
                                <SlotBuilder
                                    slots={equippedItem.properties.slots}
                                    buildState={buildState}
                                    onEquip={onEquip}
                                    depth={depth + 1}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// 3. ตัวจัดการแต่ละ Slot
const SlotItem = ({ slot, equippedItem, onEquip, depth, buildState }) => {
    const [isOpen, setIsOpen] = useState(false);
    const allowedItems = useMemo(() => getAllowedItems(slot.filters), [slot.filters]);
    const displaySlotName = slot.name.replace('mod_', '').replace(/_/g, ' ').toUpperCase();

    const [search, setSearch] = useState("");
    // id ของปุ่มในลิสต์ ใส่ prefix slot.id กัน id ซ้ำข้าม slot ที่เปิดพร้อมกัน
    const optionDomId = (itemId) => `${slot.id}-${itemId}`;

    const searchResults = useMemo(
        () => allowedItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
        [search, allowedItems]
    );

    const scrollToElement = (id) => {
        const element = document.getElementById(id);
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && equippedItem?.id) scrollToElement(optionDomId(equippedItem.id));
    }, [isOpen]);

    // Helper to check conflicts
    const getConflictInfo = (candidateItem) => {
        if (!buildState) return null;

        // Check against all currently equipped items
        for (const [_, equipped] of Object.entries(buildState)) {
            if (!equipped) continue;

            // 1. Check if EQUIPPED item lists CANDIDATE as a conflict
            if (equipped.conflictingItems?.some(c => c.id === candidateItem.id)) {
                return `Conflicts with ${equipped.shortName}`;
            }

            // 2. Check if CANDIDATE item lists EQUIPPED as a conflict
            if (candidateItem.conflictingItems?.some(c => c.id === equipped.id)) {
                return `Conflicts with ${equipped.shortName}`;
            }
        }
        return null;
    };

    return (
        <div className={`card ${equippedItem ? 'border-secondary bg-dark' : 'border-secondary bg-transparent'} mb-1`}>
            <div
                className="card-body p-2 d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="d-flex align-items-center overflow-hidden">
                    <div className={`me-3 rounded-pill ${equippedItem ? 'bg-warning' : 'bg-secondary'}`} style={{ width: '4px', height: '32px' }}></div>

                    <div className="d-flex flex-column">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-secondary text-light" style={{ fontSize: '0.65rem' }}>{displaySlotName}</span>
                            {slot.required && <span className="badge bg-warning text-dark" style={{ fontSize: '0.6rem' }}>REQUIRED</span>}
                            {depth > 0 && <span className="badge border border-secondary text-secondary" style={{ fontSize: '0.6rem' }}>SUB</span>}
                        </div>

                        {equippedItem ? (
                            <div className="d-flex align-items-center mt-1">
                                <img
                                    src={equippedItem.iconLink}
                                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                    className="me-2"
                                    alt=""
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                                <small className="text-light text-truncate" style={{ maxWidth: '150px' }}>{equippedItem.shortName}</small>
                                <div className="d-flex gap-2 small ms-1 mt-1" style={{ fontSize: '0.7rem' }}>
                                    {equippedItem.properties?.ergonomics ? <span className={equippedItem.properties.ergonomics > 0 ? "text-success" : "text-danger"}>Ergo {equippedItem.properties.ergonomics > 0 ? '+' : ''}{equippedItem.properties.ergonomics}</span> : null}
                                    {equippedItem.properties?.recoil ? <span className="text-info">Recoil {equippedItem.properties.recoil}</span> : null}
                                    {itemBuyLabel(equippedItem) ? <span className="text-warning" title={getBestBuy(equippedItem)?.vendor?.name || 'Base price'}>{itemBuyLabel(equippedItem)}</span> : null}
                                </div>
                            </div>
                        ) : (
                            <small className="text-muted fst-italic">Empty</small>
                        )}
                    </div>
                </div>
                <div className="d-flex ms-auto" style={{ maxWidth: "200px", minWidth: "150px" }}>
                    <input
                        className="form-control shadow-sm px-3"
                        placeholder="🔍 Search item..."
                        onClick={(e) => e.stopPropagation()}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                    />
                </div>
                <div className="text-muted ps-2">
                    {isOpen ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
                </div>
            </div>

            {isOpen && (
                <div className="card-footer bg-black border-top border-secondary p-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <div className="d-grid gap-1">
                        <button
                            onClick={() => { onEquip(slot.id, null); setIsOpen(false); setSearch(""); }}
                            className="btn btn-sm btn-outline-danger text-start d-flex align-items-center"
                        >
                            <Icons.AlertTriangle size={14} className="me-2" /> UNEQUIP
                        </button>

                        {searchResults.length > 0 ? searchResults.map((item) => {
                            const conflictMsg = getConflictInfo(item);
                            const isEquipped = equippedItem?.id === item.id;
                            return (
                                <button
                                    id={optionDomId(item.id)}
                                    key={item.id}
                                    disabled={!!conflictMsg}
                                    onClick={() => { onEquip(slot.id, item); setIsOpen(false); setSearch(""); }}
                                    className={`btn btn-sm text-start d-flex align-items-center p-2 border-0 position-relative 
                                ${isEquipped ? 'btn-dark text-warning' : 'btn-outline-dark text-light'}
                                ${conflictMsg ? 'opacity-50' : ''}
                            `}
                                >
                                    <div className="me-2 rounded bg-dark d-flex align-items-center justify-content-center">
                                        <img src={item.iconLink} alt={item.shortName} style={{ width: '75px', height: '75px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="text-truncate w-100">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{item.name}</span>
                                        </div>
                                        <div className="d-flex gap-2 small opacity-75 mt-1" style={{ fontSize: '0.8rem' }}>
                                            {conflictMsg ? (
                                                <span className="text-danger d-flex align-items-center fw-bold">
                                                    <Icons.Ban size={10} className="me-1" /> {conflictMsg}
                                                </span>
                                            ) : (
                                                <>
                                                    {item.properties?.ergonomics ? <span className={item.properties.ergonomics > 0 ? "text-success" : "text-danger"}>Ergo {item.properties.ergonomics > 0 ? '+' : ''}{item.properties.ergonomics}</span> : null}
                                                    {item.properties?.recoil ? <span className="text-info">Recoil {item.properties.recoil}</span> : null}
                                                    {itemBuyLabel(item) ? <span className="text-warning" title={getBestBuy(item)?.vendor?.name || 'Base price'}>{itemBuyLabel(item)}</span> : null}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        }) : (
                            <div className="text-center text-muted small py-3">No compatible items found via API</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
export default function WeaponBuild() {
    const [selectedWeapon, setSelectedWeapon] = useState(null);
    const [buildState, setBuildState] = useState({}); // { [slotId]: ItemObject }
    const [save, setSave] = useState(() => {
        const savePreset = localStorage.getItem('eft_preset_weapon');
        return savePreset ? JSON.parse(savePreset) : []
    });
    const [togglePreset, setTogglePreset] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPopup, setIsPopup] = useState(false);
    const [presetName, setPresetName] = useState("");
    const [showParts, setShowParts] = useState(true);
    const [dataset, setDataset] = useState(DATASET); // { guns, mods }
    const [loadingData, setLoadingData] = useState(!DATASET);

    useEffect(() => {
        localStorage.setItem('eft_preset_weapon', JSON.stringify(save));
    }, [save]);

    // โหลด dataset (static JSON) ครั้งเดียวตอน mount
    useEffect(() => {
        let alive = true;
        loadDataset()
            .then((d) => { if (alive) { setDataset(d); setLoadingData(false); } })
            .catch((e) => { if (alive) { console.error('Load dataset failed:', e); setLoadingData(false); } });
        return () => { alive = false; };
    }, []);

    // เลือกปืนจากผลค้นหา -> ประกอบต้นไม้อะไหล่จาก dataset (ในเครื่อง ไม่ยิงเน็ต)
    const handleSelectWeapon = (weapon) => {
        setBuildState({});
        const gun = dataset?.guns?.find((g) => g.id === weapon.id) || weapon;
        setSelectedWeapon(buildWeapon(gun, dataset?.mods || {}));
    };

    const handleEquip = (slotId, item) => {
        setBuildState(prev => {
            // สร้างสำเนา State เดิม
            const newState = { ...prev };

            // ฟังก์ชันสำหรับลบลูกหลานแบบ Recursive
            const removeChildren = (parentItem) => {
                if (parentItem.properties && parentItem.properties.slots) {
                    parentItem.properties.slots.forEach(subSlot => {
                        const childItem = prev[subSlot.id]; // เช็คจาก State ก่อนหน้าว่ามีของใส่อยู่ไหม
                        if (childItem) {
                            removeChildren(childItem); // ลบหลานต่อ
                            delete newState[subSlot.id]; // ลบลูกออกจาก State ใหม่
                        }
                    });
                }
            };

            // ถ้า Slot นี้เคยมีของใส่ไว้ ให้ลบลูกๆ ของมันออกก่อน
            const previousItem = prev[slotId];
            if (previousItem) {
                removeChildren(previousItem);
            }

            // อัปเดตของใหม่ใส่ Slot (หรือลบถ้า item เป็น null)
            if (item) {
                newState[slotId] = item;
            } else {
                delete newState[slotId];
            }

            return newState;
        });
    };

    const savePresets = (name, isAdd) => {
        if (isAdd) {
            const trimmed = (name || '').trim();
            if (!trimmed || !selectedWeapon) return; // ต้องมีชื่อ + มีปืนที่เลือกอยู่

            // เก็บเฉพาะ id + name ต่อช่อง (พอ re-resolve ตอนโหลด) — localStorage เล็ก
            const build_state = Object.fromEntries(
                Object.entries(buildState).map(([slotId, item]) => [slotId, { id: item.id, name: item.name }])
            );
            const presetToSave = {
                preset_name: trimmed,
                base_weapon: {
                    id: selectedWeapon.id,
                    name: selectedWeapon.name,
                    iconLink: selectedWeapon.iconLink,
                    shortName: selectedWeapon.shortName,
                },
                build_state,
            };

            // ชื่อซ้ำ = อัปเดตทับ (กันชื่อซ้ำ -> key ซ้ำ / ลบพลาด)
            setSave((prev) => [...prev.filter((p) => p.preset_name !== trimmed), presetToSave]);

            setPresetName("");
            setIsPopup(false);
        }
        else {
            setSave((prev) => prev.filter((p) => p.preset_name !== name));
        }
    };

    const getSavePreset = (weapon, build) => {
        setIsLoading(true);

        // ใช้ปืนที่เลือกอยู่ถ้าตรงกัน ไม่งั้นประกอบใหม่จาก dataset
        let baseWeapon = selectedWeapon;
        if (!selectedWeapon || selectedWeapon.id !== weapon.id) {
            const gun = dataset?.guns?.find((g) => g.id === weapon.id);
            baseWeapon = buildWeapon(gun, dataset?.mods || {});
            setSelectedWeapon(baseWeapon);
        }

        if (!baseWeapon) {
            console.warn('Preset weapon not found in dataset:', weapon?.id);
            setSelectedWeapon(null);
            setBuildState({});
            setIsLoading(false);
            return;
        }

        // เดิน tree: ช่องไหนมีของบันทึกไว้ (build[slot.id]) -> หา item ในช่องนั้นด้วย id แล้ว set ตาม slot.id
        // slot.id คงที่ (GUID จากเกม) จึง match ตรงช่อง รองรับมอดตัวเดียวกันในหลายช่อง และไม่มี key ปนเลข index
        const result = {};
        const walk = (slots) => {
            (slots || []).forEach((slot) => {
                const saved = build[slot.id];
                if (!saved) return;
                const item = (slot.filters?.allowedItems || []).find((a) => a.id === saved.id);
                if (item) {
                    result[slot.id] = item;
                    walk(item.properties?.slots); // ลงช่องย่อยของชิ้นที่ใส่
                }
            });
        };
        walk(baseWeapon.properties?.slots);

        setBuildState(result);
        setIsLoading(false);
    };

    // ถ้ามาจากปุ่ม "Edit build" ในหน้า optimizer -> อ่าน build ที่ฝากไว้แล้วโหลด (ทำครั้งเดียวตอน dataset พร้อม)
    useEffect(() => {
        if (!dataset) return;
        const raw = localStorage.getItem(EDIT_BUILD_KEY);
        if (!raw) return;
        localStorage.removeItem(EDIT_BUILD_KEY);
        try {
            const h = JSON.parse(raw);
            if (h?.base_weapon?.id) getSavePreset(h.base_weapon, h.build_state || {});
        } catch (e) {
            console.error('load edit build failed:', e);
        }
    }, [dataset]);

    return (
        <>
            <style>{`
        body { background-color: #000; color: #eee; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }
        .hover-effect:hover { background-color: #495057 !important; border-color: #ffc107 !important; }
      `}</style>
            <div className="py-5">
                <button
                    onClick={() => setTogglePreset(!togglePreset)}
                    className='btn btn-outline-secondary text-warning border-info position-fixed end-0 me-5'
                    style={{ top: '80px', zIndex: 25 }}
                >
                    Presets
                </button>

                <div className='container' style={{ maxWidth: '1200px' }}>

                    <header className="mb-5 border-bottom border-secondary pb-4">
                        <h1 className="display-4 fw-bold fst-italic">
                            WEAPON <span className="text-warning">BUILD</span>
                        </h1>
                    </header>

                    <WeaponSearch guns={dataset?.guns || []} loadingData={loadingData} onSelect={handleSelectWeapon} onBuildState={setBuildState} />

                    {selectedWeapon ? (
                        <div className="row g-4 animate-fade-in">
                            <div className="col-lg-4">
                                <div className="card bg-dark border-secondary sticky-top" style={{ top: '80px',zIndex: '0' }}>
                                    <div className="card-body text-center p-4">
                                        <div className='position-absolute top-0 end-0 m-3 cursor-pointer'
                                            onClick={() => setIsPopup(true)}>
                                            <Icons.Book />
                                        </div>
                                        <h4 className="card-title text-warning fw-bold">{selectedWeapon.shortName}</h4>
                                        <div className="text-white font-monospace mb-3">{selectedWeapon.name}</div>
                                        <img
                                            src={selectedWeapon.gridImageLink || selectedWeapon.iconLink}
                                            alt={selectedWeapon.name}
                                            className="img-fluid mb-3 drop-shadow"
                                        />
                                        <WeaponStats baseWeapon={selectedWeapon} buildState={buildState} />
                                        <div>

                                        </div>
                                        {/* <div className="alert alert-warning mt-3 mb-0 py-2 small bg-opacity-10 border-warning text-warning">
                                            Select parts on the right to modify
                                        </div> */}
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-8">
                                <WeaponPreview baseWeapon={selectedWeapon} buildState={buildState} onClear={() => setBuildState({})} />
                                <div className="card bg-dark border-secondary">
                                    <div
                                        className="card-header bg-transparent border-secondary text-light fw-bold d-flex align-items-center"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setShowParts(!showParts)}
                                    >
                                        <Icons.Info size={18} className="me-2 text-warning" /> WEAPON PARTS
                                        <span className="ms-auto text-muted">
                                            {showParts ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}
                                        </span>
                                    </div>
                                    {showParts && (
                                    <div className="card-body" style={{ minHeight: '500px' }}>
                                        {selectedWeapon.properties?.slots ? (
                                            <SlotBuilder
                                                slots={selectedWeapon.properties.slots}
                                                buildState={buildState}
                                                onEquip={handleEquip}
                                            />
                                        ) : (
                                            <div className="text-center p-5 border border-secondary border-dashed rounded text-muted">
                                                This item has no modding slots.
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5 rounded border border-secondary border-dashed bg-dark bg-opacity-25">
                            <div className='d-flex justify-content-center mb-3'>
                                <Icons.Package size={64} className="opacity-25" />
                            </div>
                            <p className="lead text-muted">{isLoading ? ("Loading weapon ...") : ("Select a weapon above to initialize the Gunsmith bench.")}</p>
                        </div>
                    )}
                </div>

                <div style={{ ...styles.sidebar(togglePreset), width: '25%' }}>
                    <div className="m-2 text-warning d-flex align-items-center">
                        {save.length > 0 && (<h5 className='mx-2'>Presets</h5>)}
                        <button className='btn border-0 d-flex ms-auto' onClick={() => setTogglePreset(false)}>
                            <Icons.ChevronRight size={24} />
                        </button>
                    </div>
                    {save.length > 0 ? (
                        <>
                            <div className="m-2">

                                {save?.map((preset) => (
                                    <div
                                        key={preset.preset_name}
                                        className="card bg-dark text-light h-10 border-0 pointer-cursor hover-effect m-2"
                                        style={{ cursor: 'pointer', transition: '0.2s' }}
                                        onClick={() => getSavePreset(preset.base_weapon, preset.build_state)}
                                    >
                                        <div className="card-body d-flex align-items-center p-2">
                                            <img
                                                src={preset.base_weapon?.iconLink}
                                                alt={preset.base_weapon?.shortName}
                                                className="me-3 rounded bg-dark p-1"
                                                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                            />
                                            <div>
                                                <div className="fw-bold text-white">{preset.preset_name}</div>
                                                <small className="text-warning opacity-75">{preset.base_weapon?.shortName}</small>
                                            </div>
                                            <button className='btn border-0 d-flex ms-auto' onClick={() => savePresets(preset.preset_name, false)}>
                                                <Icons.Close size={24} color={"#FF0000"} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="d-flex align-items-center justify-content-center">
                                <h1 className="display-4 fw-bold fst-italic">
                                    <span className="text-secondary">No Preset</span>
                                </h1>
                            </div>
                        </>
                    )}
                </div>

                {isPopup && (
                    <div style={styless.modalOverlayStyle}>
                        <div style={styless.modalContentStyle}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: COLORS.textPrimary, textTransform: 'uppercase' }}>create preset</h3>
                            <div style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', }}>
                                <input
                                    type="text"
                                    className="form-control bg-dark text-light border-secondary"
                                    value={presetName}
                                    autoFocus
                                    placeholder="Preset name"
                                    onChange={(e) => setPresetName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && presetName.trim()) savePresets(presetName, true); }} />
                            </div>
                            {save.some((p) => p.preset_name === presetName.trim()) && presetName.trim() && (
                                <div className="text-warning small mt-2 text-center">Name exists — will overwrite</div>
                            )}
                            <div style={styless.modalButtonsContainerStyle}>
                                <button onClick={() => setIsPopup(false)} style={styless.modalCancelButtonStyle}>
                                    Cancel
                                </button>
                                <button
                                    onClick={() => savePresets(presetName, true)}
                                    disabled={!presetName.trim()}
                                    style={{ ...styless.modalConfirmButtonStyle, opacity: presetName.trim() ? 1 : 0.5, cursor: presetName.trim() ? 'pointer' : 'not-allowed' }}>
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}