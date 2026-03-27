import React, { useState, useEffect, useMemo, useRef } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import { Icons, hideoutStyles as styles, kappaStyles as styless, COLORS } from '../Component/EftComponent';

const fetchGraphQL = async (name) => {
    try {
        const savegameplayMode = JSON.parse(localStorage.getItem('eft_gameplay_mode'));
        const query = `
            query MyQuery {
                items(name: "${name}", type: gun, limit: 5, gameMode: ${savegameplayMode === 'pve' ? 'pve' : 'regular'}) {
                    id
                    name
                    shortName
                    iconLink
                    gridImageLink
                    basePrice
                    weight
                    properties {
                    ... on ItemPropertiesWeapon {
                        caliber
                        ergonomics
                        recoilVertical
                        recoilHorizontal
                        fireRate
                        defaultErgonomics
                        defaultRecoilVertical
                        defaultRecoilHorizontal
                        slots {
                        id
                        name
                        nameId
                        filters {
                            allowedItems {
                            id
                            name
                            shortName
                            iconLink
                            weight
                            conflictingItems {
                                id
                                name
                            }
                            properties {
                                ... on ItemPropertiesWeaponMod {
                                ergonomics
                                recoil
                                slots {
                                    id
                                    name
                                    filters {
                                    allowedItems {
                                        id
                                        name
                                        shortName
                                        iconLink
                                        weight
                                        conflictingItems {
                                        id
                                        name
                                        }
                                        properties {
                                        ... on ItemPropertiesWeaponMod {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                                slots {
                                                                id
                                                                name
                                                                filters {
                                                                    allowedItems {
                                                                    id
                                                                    name
                                                                    shortName
                                                                    iconLink
                                                                    weight
                                                                    conflictingItems {
                                                                        id
                                                                        name
                                                                    }
                                                                    properties {
                                                                        ... on ItemPropertiesWeaponMod {
                                                                        ergonomics
                                                                        recoil
                                                                        }
                                                                    }
                                                                    }
                                                                }
                                                                }
                                                            }
                                                            ... on ItemPropertiesScope {
                                                                ergonomics
                                                                recoil
                                                                slots {
                                                                id
                                                                name
                                                                filters {
                                                                    allowedItems {
                                                                    id
                                                                    name
                                                                    shortName
                                                                    iconLink
                                                                    weight
                                                                    conflictingItems {
                                                                        id
                                                                        name
                                                                    }
                                                                    properties {
                                                                        ... on ItemPropertiesWeaponMod {
                                                                        ergonomics
                                                                        recoil
                                                                        }
                                                                    }
                                                                    }
                                                                }
                                                                }
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                    ... on ItemPropertiesScope {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                            }
                                                            ... on ItemPropertiesScope {
                                                                ergonomics
                                                                recoil
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                    ... on ItemPropertiesBarrel {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                                slots {
                                                                id
                                                                name
                                                                filters {
                                                                    allowedItems {
                                                                    id
                                                                    name
                                                                    shortName
                                                                    iconLink
                                                                    weight
                                                                    conflictingItems {
                                                                        id
                                                                        name
                                                                    }
                                                                    properties {
                                                                        ... on ItemPropertiesWeaponMod {
                                                                        ergonomics
                                                                        recoil
                                                                        }
                                                                    }
                                                                    }
                                                                }
                                                                }
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        ... on ItemPropertiesScope {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                    ... on ItemPropertiesScope {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        ... on ItemPropertiesBarrel {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    slots {
                                                        id
                                                        name
                                                        filters {
                                                        allowedItems {
                                                            id
                                                            name
                                                            shortName
                                                            iconLink
                                                            weight
                                                            conflictingItems {
                                                            id
                                                            name
                                                            }
                                                            properties {
                                                            ... on ItemPropertiesWeaponMod {
                                                                ergonomics
                                                                recoil
                                                            }
                                                            }
                                                        }
                                                        }
                                                    }
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        }
                                    }
                                    }
                                }
                                }
                                ... on ItemPropertiesScope {
                                ergonomics
                                recoil
                                slots {
                                    id
                                    name
                                    filters {
                                    allowedItems {
                                        id
                                        name
                                        shortName
                                        iconLink
                                        weight
                                        conflictingItems {
                                        id
                                        name
                                        }
                                        properties {
                                        ... on ItemPropertiesWeaponMod {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    }
                                                    ... on ItemPropertiesScope {
                                                    ergonomics
                                                    recoil
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        ... on ItemPropertiesScope {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    }
                                                    ... on ItemPropertiesScope {
                                                    ergonomics
                                                    recoil
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        }
                                    }
                                    }
                                }
                                }
                                ... on ItemPropertiesMagazine {
                                ergonomics
                                recoil
                                slots {
                                    id
                                    name
                                    filters {
                                    allowedItems {
                                        id
                                        name
                                        shortName
                                        iconLink
                                        weight
                                        conflictingItems {
                                        id
                                        name
                                        }
                                    }
                                    }
                                }
                                }
                                ... on ItemPropertiesBarrel {
                                ergonomics
                                recoil
                                slots {
                                    id
                                    name
                                    filters {
                                    allowedItems {
                                        id
                                        name
                                        shortName
                                        iconLink
                                        weight
                                        conflictingItems {
                                        id
                                        name
                                        }
                                        properties {
                                        ... on ItemPropertiesWeaponMod {
                                            ergonomics
                                            recoil
                                            slots {
                                            id
                                            name
                                            filters {
                                                allowedItems {
                                                id
                                                name
                                                shortName
                                                iconLink
                                                weight
                                                conflictingItems {
                                                    id
                                                    name
                                                }
                                                properties {
                                                    ... on ItemPropertiesWeaponMod {
                                                    ergonomics
                                                    recoil
                                                    }
                                                }
                                                }
                                            }
                                            }
                                        }
                                        }
                                    }
                                    }
                                }
                                }
                            }
                            }
                        }
                        }
                    }
                    }
                }
                }
                `;

        const response = await fetch('https://api.tarkov.dev/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const json = await response.json();

        if (json.errors) {
            console.error("GraphQL Errors:", json.errors);
            return null;
        }

        return json.data;
    } catch (error) {
        console.error("Network or Parsing Error:", error);
        return null;
    }
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

// --- Components ---

// 1. ส่วนค้นหาปืน
const WeaponSearch = ({ onSelect, onBuildState }) => {
    const [term, setTerm] = useState('M4A1');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!term.trim()) return;

        setLoading(true);
        setErrorMsg('');
        setResults([]);

        try {
            const data = await fetchGraphQL(term);

            if (data && data.items) {
                setResults(data.items);
            } else {
                setResults([]);
                if (!data) setErrorMsg("Failed to fetch data from Tarkov.dev");
            }
        } catch (error) {
            console.error("API Error:", error);
            setErrorMsg("An unexpected error occurred.");
        }
        setLoading(false);
    };

    return (
        <div className="card bg-dark text-light border-secondary mb-4 shadow-sm">
            <div className="card-header border-secondary">
                <h5 className="mb-0 text-warning d-flex align-items-center">
                    <Icons.Search className="me-2" size={20} /> Select Base Weapon
                </h5>
            </div>
            <div className="card-body">
                <form onSubmit={handleSearch} className="input-group mb-3">
                    <input
                        type="text"
                        className="form-control bg-dark text-light border-secondary"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        placeholder="ex. M4A1, AK-74, GLOCK"
                    />
                    <button className="btn btn-warning fw-bold" type="submit" disabled={loading}>
                        {loading ? 'Loading...' : 'Search'}
                    </button>
                </form>

                {errorMsg && <div className="alert alert-danger py-2">{errorMsg}</div>}

                <div className="row g-2">
                    {results.map((weapon) => (
                        <div key={weapon.id} className="col-md-6">
                            <div
                                onClick={() => { onSelect(weapon); onBuildState({}) }}
                                className="card bg-secondary text-light h-100 border-0 pointer-cursor hover-effect"
                                style={{ cursor: 'pointer', transition: '0.2s' }}
                            >
                                <div className="card-body d-flex align-items-center p-2">
                                    <img
                                        src={weapon.iconLink}
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
        </div>
    );
};

const calTotalStats = (slotId, buildState, total = { weight: 0, ergo: 0, recoilMod: 0 }) => {
    const item = buildState[slotId];

    // 1. If no item is in this slot, return the current total accumulation
    if (!item) return total;

    // 2. Add Weight
    if (item.weight) total.weight += item.weight;

    // 3. Add Mod Properties
    if (item.properties) {
        if (item.properties.ergonomics) {
            total.ergo += item.properties.ergonomics;
        }
        if (item.properties.recoil) {
            total.recoilMod += item.properties.recoil;
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

// --- Stats Component (New) ---
const WeaponStats = ({ baseWeapon, buildState }) => {
    // Logic คำนวณ Stats

    const stats = useMemo(() => {
        if (!baseWeapon || !baseWeapon.properties) return null;

        let totalWeight = baseWeapon.weight || 0;
        let totalErgo = baseWeapon.properties.defaultErgonomics || baseWeapon.properties.ergonomics || 0;
        let recoilMod = 0; // % reduction (negative value usually)

        // วนลูปของแต่งทั้งหมดใน buildState
        // Object.values(buildState).forEach(item => {
        //     if (!item) return;

        //     // Weight (kg)
        //     if (item.weight) totalWeight += item.weight;

        //     // Mod Properties
        //     if (item.properties) {
        //         // Ergonomics (บวกเพิ่มตรงๆ)
        //         if (item.properties.ergonomics) totalErgo += item.properties.ergonomics;

        //         // Recoil (สะสม % modifier)
        //         // API ส่งมาเป็น float เช่น -0.02 หมายถึงลดแรงดีด 2%
        //         if (item.properties.recoil) recoilMod += item.properties.recoil;
        //     }
        // });

        baseWeapon.properties.slots.forEach(slot => {
            const total = calTotalStats(slot.id, buildState);

            totalWeight += total.weight;
            totalErgo += total.ergo;
            recoilMod += total.recoilMod;
        });



        // --- Recoil Calculation Logic ---
        // สูตร: Base Recoil * (1 + Sum of Mod Recoil %)
        // ตัวอย่าง: ปืน 100 * (1 + (-0.15)) = 85
        const baseVert = baseWeapon.properties.defaultRecoilVertical || baseWeapon.properties.recoilVertical || 0;
        const baseHoriz = baseWeapon.properties.defaultRecoilHorizontal || baseWeapon.properties.recoilHorizontal || 0;

        const finalVert = Math.max(0, Math.round(baseVert * (1 + (recoilMod / 100))));
        const finalHoriz = Math.max(0, Math.round(baseHoriz * (1 + (recoilMod / 100))));

        return {
            weight: totalWeight.toFixed(3),
            ergonomics: Math.max(0, totalErgo.toFixed(1)),
            verticalRecoil: finalVert,
            horizontalRecoil: finalHoriz,
            fireRate: baseWeapon.properties.fireRate || 0,
            basePrice: baseWeapon.basePrice,
            caliber: baseWeapon.properties.caliber
        };
    }, [baseWeapon, buildState]);

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
                    <div className="col-6">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Fire Rate</div>
                            <div className="fw-bold text-white">{stats.fireRate} <span className="small text-muted">rpm</span></div>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="p-2 bg-dark rounded border border-secondary text-center">
                            <div className="text-muted small text-uppercase" style={{ fontSize: '0.65rem' }}>Caliber</div>
                            <div className="fw-bold text-white small">{stats.caliber}</div>
                        </div>
                    </div>
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
    const allowedItems = getAllowedItems(slot.filters);
    const displaySlotName = slot.name.replace('mod_', '').replace(/_/g, ' ').toUpperCase();

    const [search, setSearch] = useState("");
    const [searchResults, setResults] = useState([]);

    const scrollToElement = (id) => {
        const element = document.getElementById(id);
        element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToElement(equippedItem?.id);
    }, [isOpen]);

    useEffect(() => {
        setResults(allowedItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())));
    }, [search]);

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
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="text-muted ps-2">
                    {isOpen ? <Icons.ChevronDown size={16} /> : <Icons.ChevronUp size={16} />}
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
                                    id={item.id}
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

    useEffect(() => {
        localStorage.setItem('eft_preset_weapon', JSON.stringify(save));
    }, [save]);

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
            const preset = {
                preset_name: name,
                base_weapon: selectedWeapon,
                build_state: buildState
            }
            const newObject = Object.fromEntries(
                Object.entries(buildState).map(([key, value]) => [
                    key,
                    { id: value.id, name: value.name }
                ])
            );
            const presetToSave = {
                preset_name: name,
                base_weapon: { id: selectedWeapon.id, name: selectedWeapon.name, iconLink: selectedWeapon.iconLink, shortName: selectedWeapon.shortName },
                build_state: newObject
            }
            console.log(preset);
            console.log(presetToSave);
            setSave(prev => [...prev, presetToSave])

            setPresetName("");
            setIsPopup(false);
        }
        else {
            setSave(prev => prev.filter(p => p.preset_name !== name));
        }
    }

    const getAllBuildState = (slots, oldBuildState, newBuildState = new Set()) => {

        slots.map(slot => {
            const currentAllowItems = slot.filters?.allowedItems || [];
            const updatedAllowItems = currentAllowItems.find(item => item?.id === oldBuildState[slot.id]?.id);

            if (updatedAllowItems) newBuildState.add(updatedAllowItems);
            if (updatedAllowItems?.properties?.slots) {
                getAllBuildState(updatedAllowItems.properties?.slots, oldBuildState, newBuildState)
            }
        })

        return newBuildState;
    };

    const getSavePreset = async (weapon, build) => {
        let baseWeapon = null;
        setSelectedWeapon();
        setIsLoading(true);
        if (!selectedWeapon || selectedWeapon.id !== weapon.id) {
            try {
                const data = await fetchGraphQL(weapon?.shortName);
                
                if (data && data.items) {
                    setSelectedWeapon(data.items?.[0]);
                    baseWeapon = data.items?.[0];
                } else {
                    if (!data) console.error("Failed to fetch data from Tarkov.dev");
                }
            } catch (error) {
                console.error("API Error:", error);
            }
        }
        else baseWeapon = selectedWeapon
        
        const buildState = getAllBuildState(baseWeapon?.properties?.slots, build)
        const matchMap = new Map(
            Object.entries(build).map(([slotId, val]) => [
                `${val.id}::${val.name}`,
                { slotId, ...val }
            ])
        );
        
        const result = [...buildState].reduce((acc, item, i) => {
            const key = `${item.id}::${item.name}`;
            if (matchMap.has(key)) {
                const { slotId, ...rest } = matchMap.get(key);
                acc[slotId] = { ...rest, ...item };
            } else {
                acc[i] = item;
            }
            return acc;
        }, {});
        setBuildState(result);
        setIsLoading(false);

        // console.log(baseWeapon);
        // console.log(result);

    }

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

                    <WeaponSearch onSelect={setSelectedWeapon} onBuildState={setBuildState} />

                    {selectedWeapon ? (
                        <div className="row g-4 animate-fade-in">
                            <div className="col-lg-4">
                                <div className="card bg-dark border-secondary sticky-top" style={{ top: '80px' }}>
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
                                        <div className="alert alert-warning mt-3 mb-0 py-2 small bg-opacity-10 border-warning text-warning">
                                            Select parts on the right to modify
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-8">
                                <div className="card bg-dark border-secondary">
                                    <div className="card-header bg-transparent border-secondary text-light fw-bold d-flex align-items-center">
                                        <Icons.Info size={18} className="me-2 text-warning" /> WEAPON PARTS
                                    </div>
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
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5 rounded border border-secondary border-dashed bg-dark bg-opacity-25">
                            <div className='d-flex justify-content-center mb-3'>
                                <Icons.Package size={64} className="opacity-25" />
                            </div>
                            <p className="lead text-muted">{isLoading ? ("Loading Preset ..."):("Select a weapon above to initialize the Gunsmith bench.")}</p>
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
                                    onChange={(e) => setPresetName(e.target.value)} />
                            </div>
                            <div style={styless.modalButtonsContainerStyle}>
                                <button onClick={() => setIsPopup(false)} style={styless.modalCancelButtonStyle}>
                                    Cancel
                                </button>
                                <button onClick={() => savePresets(presetName, true)} style={styless.modalConfirmButtonStyle}>
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