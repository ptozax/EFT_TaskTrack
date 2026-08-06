import React, { useState, useMemo, useEffect, useRef } from 'react';
import { theme, hideoutStyles as styles, Icons } from '../Component/EftComponent';
import * as QuestComponent from '../Component/QuestComponent';
import hideoutStatic from '../data/hideout.json';
import { useLiveData } from '../data/gameStore';

const Hideout = () => {
    const hideout = useLiveData(hideoutStatic, 'hideout'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static
    const groupedModules = useMemo(() => {
        const modules = {};
        hideout.forEach(mod => {
            modules[mod.name] = mod.levels.map(lvl => ({
                ...lvl,
                name: mod.name,
                moduleRequirements: lvl.stationLevelRequirements ? lvl.stationLevelRequirements.map(r => ({
                    name: r.station.name,
                    level: r.level,
                    id: r.id || `${mod.name}-${lvl.level}-${r.station.name}`
                })) : []
            })).sort((a, b) => a.level - b.level);
        });
        return modules;
    }, []);

    const [currentLevels, setCurrentLevels] = useState(() => {
        const initial = {};
        Object.keys(groupedModules).forEach(key => initial[key] = key === 'Stash' ? 1 : 0);
        const save = JSON.parse(localStorage.getItem("eft_hideout")) || initial;
        return save;
    });

    useEffect(() => {
        const handleStorageChange = (event) => {
            try {
                // console.log("Storage changed detected! at Hideout");
                resetProgress();
            } catch (err) {
                console.error(err);
            }
        };

        return QuestComponent.callbackStorageChange(handleStorageChange);
    }, []);

    useEffect(() => {
        localStorage.setItem("eft_hideout", JSON.stringify(currentLevels));
        setIsEOD(currentLevels['Stash'] === 4 ? true : false);
    }, [currentLevels]);

    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isEOD, setIsEOD] = useState(currentLevels['Stash'] === 4 ? true : false);
    const [showFirOnly, setShowFirOnly] = useState(false); // NEW STATE
    const [showUseInModule, setShowUseInModule] = useState(false);
    const [inventory, setInventory] = useState({});

    // Toggle EOD: If ON, Stash level becomes 4 (Max). If OFF, reverts to 1.
    const toggleEOD = () => {
        const newValue = !isEOD;
        setIsEOD(newValue);
        setCurrentLevels(prev => ({
            ...prev,
            Stash: newValue ? 4 : 1
        }));
    };

    const getNextLevelData = (moduleName) => {
        const currentLvl = currentLevels[moduleName];
        const nextLvlIndex = groupedModules[moduleName].findIndex(m => m.level === currentLvl + 1);
        if (nextLvlIndex !== -1) {
            return groupedModules[moduleName][nextLvlIndex];
        }
        return null;
    };

    const visibleModules = useMemo(() => {
        const modules = Object.keys(groupedModules);
        // const filtered = modules.filter(moduleName => {
        //     const currentLvl = currentLevels[moduleName];
        //     const nextLvlData = getNextLevelData(moduleName);
        //     if (!nextLvlData && currentLvl > 0) return true;
        //     if (!nextLvlData) return false;
        //     if (nextLvlData.moduleRequirements) {
        //         return nextLvlData.moduleRequirements.every(req => {
        //             if (groupedModules[req.name]) {
        //                 return currentLevels[req.name] >= req.level;
        //             }
        //             return true;
        //         });
        //     }
        //     return true;
        // });
        const filtered = modules;
        return filtered;

        return filtered.sort((a, b) => {
            const nextA = getNextLevelData(a);
            const nextB = getNextLevelData(b);
            const aMax = !nextA;
            const bMax = !nextB;
            if (aMax && !bMax) return 1;
            if (!aMax && bMax) return -1;
            if (aMax && bMax) return a.localeCompare(b);
            const reqsA = nextA.moduleRequirements ? nextA.moduleRequirements.length : 0;
            const reqsB = nextB.moduleRequirements ? nextB.moduleRequirements.length : 0;
            if (reqsA !== reqsB) return reqsA - reqsB;
            return a.localeCompare(b);
        });
    }, [groupedModules, currentLevels]);

    // UPDATED: Shopping list now calculates ALL future requirements (Current Level -> Max)
    const shoppingList = useMemo(() => {
        const list = {};

        // Iterate over ALL modules (not just visible ones) to create a master list
        Object.keys(groupedModules).forEach(modName => {
            const currentLvl = currentLevels[modName];
            const allLevels = groupedModules[modName];

            // Check every level higher than the current one
            allLevels.forEach(levelData => {
                if (levelData.level > currentLvl) {
                    levelData.itemRequirements.forEach(req => {
                        const itemKey = req.item.id;
                        // Check if item needs FIR
                        const isFir = req.attributes?.some(a => a.name === "foundInRaid" && a.value === "true");
                        const uniqueKey = `${itemKey}-${isFir ? 'fir' : 'norm'}`;

                        // Check if this specific item requirement row is checked in the UI
                        // Note: Users can only check items for the *active* level via UI, 
                        // so future levels will naturally remain unchecked and appear in the list.
                        const isChecked = inventory[`${modName}-${levelData.level}-${itemKey}`];

                        if (!isChecked) {
                            if (!list[uniqueKey]) {
                                list[uniqueKey] = {
                                    ...req.item,
                                    total: 0,
                                    from: [],
                                    isFir: isFir,
                                    uniqueKey: uniqueKey // Save for React key
                                };
                            }
                            list[uniqueKey].total += req.count;
                            // Add source info (e.g., "Vents Lv2")
                            list[uniqueKey].from.push(`${modName} Lv${levelData.level}`);
                        }
                    });
                }
            });
        });

        return Object.values(list).sort((a, b) => b.total - a.total);
    }, [groupedModules, currentLevels, inventory]);

    const scrollToModule = (name) => {
        const el = document.getElementById(`module-${name}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const toggleItem = (moduleName, level, itemId) => {
        const key = `${moduleName}-${level}-${itemId}`;
        setInventory(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleModuleReq = (moduleName, level, reqId) => {
        const key = `${moduleName}-${level}-mod-${reqId}`;
        setInventory(prev => ({ ...prev, [key]: !prev[key] }));
    }

    const isItemChecked = (moduleName, level, itemId) => !!inventory[`${moduleName}-${level}-${itemId}`];
    const isModuleReqChecked = (moduleName, level, reqId) => !!inventory[`${moduleName}-${level}-mod-${reqId}`];

    const handleBuild = (moduleName) => {
        setCurrentLevels(prev => ({ ...prev, [moduleName]: prev[moduleName] + 1 }));
    };

    const handlePreviousBuild = (moduleName) => {
        setCurrentLevels(prev => ({ ...prev, [moduleName]: prev[moduleName] - 1 }));
    }

    const resetProgress = () => {
        const initial = {};
        Object.keys(groupedModules).forEach(key => initial[key] = key === 'Stash' ? 1 : 0);
        const save = JSON.parse(localStorage.getItem("eft_hideout")) || initial;
        setCurrentLevels(save);
        setInventory({});
        setIsEOD(false);
    };

    const formatTime = (seconds) => {
        if (!seconds) return "Instant";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const [copiedKeyIndex, setCopiedKeyIndex] = useState(null);
    const handleCopyName = (name, index) => {
        navigator.clipboard.writeText(name).then(() => {
            setCopiedKeyIndex(index);
            setTimeout(() => setCopiedKeyIndex(null), 500);
        });
    };

    return (
        <div style={styles.container}>
            {/* Main Content Area */}
            <div style={{ ...styles.mainContent, marginRight: isSidebarOpen ? '320px' : '0' }}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTop}>
                        <div>
                            <h1 style={styles.title}>
                                <Icons.Hammer style={{ color: theme.colors.accent }} />
                                Hideout Manager
                            </h1>
                            <p style={styles.subtitle}>
                                Tracking construction requirements for Escape from Tarkov
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {/* EOD Toggle */}
                            <label style={styles.checkboxWrapper}>
                                <input
                                    type="checkbox"
                                    checked={isEOD}
                                    onChange={toggleEOD}
                                    style={styles.checkbox}
                                />
                                <Icons.Crown size={16} color={isEOD ? theme.colors.accent : theme.colors.textMuted} />
                                Edge of Darkness
                            </label>

                            <button
                                onClick={() => setSidebarOpen(!isSidebarOpen)}
                                style={{
                                    ...styles.btnPrimary(false),
                                    backgroundColor: theme.colors.bgCard,
                                    border: `1px solid ${theme.colors.border}`,
                                    color: theme.colors.textMain,
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                }}
                            >
                                <Icons.Cart size={16} />
                                {isSidebarOpen ? 'Hide List' : 'Shopping List'}
                                <span style={styles.badge}>{shoppingList.length}</span>
                            </button>
                            {/* <button
                                onClick={resetProgress}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: theme.colors.textMuted,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontSize: '12px'
                                }}
                            >
                                Reset Data
                            </button> */}
                        </div>
                    </div>

                    {/* Module Dashboard / Navigation */}
                    <div style={styles.navGrid}>
                        {Object.keys(groupedModules).sort().map(modName => {
                            const level = currentLevels[modName];
                            const isMax = !getNextLevelData(modName) && level > 0;
                            return (
                                <button
                                    key={modName}
                                    onClick={() => scrollToModule(modName)}
                                    style={styles.navButton(level > 0, isMax)}
                                >
                                    <span style={{ fontWeight: 'bold', fontSize: '12px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{modName}</span>
                                    <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        {isMax ? (
                                            <span style={styles.maxBadge}>MAX</span>
                                        ) : (
                                            <span style={{ fontSize: '10px', color: level > 0 ? theme.colors.accent : theme.colors.textMuted, fontFamily: 'monospace' }}>
                                                {level === 0 ? "Not Built" : `Lvl ${level}`}
                                            </span>
                                        )}
                                        {isMax && <Icons.Check size={12} color={theme.colors.success} />}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Grid of Modules */}
                <div style={styles.grid}>
                    {visibleModules.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted, border: `2px dashed ${theme.colors.border}`, borderRadius: theme.rounded }}>
                            No modules unlocked. Build basic modules to unlock more.
                        </div>
                    )}

                    {visibleModules.map(moduleName => {
                        const currentLvl = currentLevels[moduleName];
                        const nextLvlData = getNextLevelData(moduleName);
                        const isMaxLevel = !nextLvlData && currentLvl > 0;

                        return (
                            <div id={`module-${moduleName}`} key={moduleName} style={styles.card}>
                                {/* Module Header */}
                                <div style={styles.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', backgroundColor: theme.colors.bgMain, borderRadius: '4px', border: `1px solid ${theme.colors.bgCard}`, overflow: 'hidden' }}>
                                            {hideout.find(m => m.name === moduleName)?.imageLink && (
                                                <img
                                                    src={hideout.find(m => m.name === moduleName).imageLink}
                                                    alt={moduleName}
                                                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                                                />
                                            )}
                                        </div>
                                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: theme.colors.textMain }}>{moduleName}</h2>

                                    </div>
                                    {currentLvl > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: '0 0.5rem', cursor: 'pointer' }}
                                            onClick={() => handlePreviousBuild(moduleName)}>
                                            <Icons.Rotate size={16} />
                                        </div>
                                    )}
                                    {isMaxLevel ? (
                                        <div style={styles.maxBadge}>
                                            <Icons.Check size={16} /> MAX LEVEL
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', color: theme.colors.textMuted }}>LV:</span>
                                            <span style={{
                                                padding: '2px 15px',
                                                borderRadius: '4px',
                                                fontSize: currentLvl === 0 ? '12px' : '25px',
                                                fontWeight: 'bold',
                                                backgroundColor: currentLvl > 0 ? theme.colors.accent : theme.colors.border,
                                                color: currentLvl > 0 ? theme.colors.bgHeader : theme.colors.textMuted
                                            }}>
                                                {currentLvl === 0 ? "Not Constructed" : currentLvl}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Active Build Area */}
                                {!isMaxLevel && nextLvlData && (
                                    <div>
                                        <div style={{ padding: '12px', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontFamily: 'monospace', color: theme.colors.accent, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Icons.ArrowUp size={16} />
                                                UPGRADING TO LEVEL {nextLvlData.level}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.colors.textMuted, fontFamily: 'monospace' }}>
                                                <Icons.Clock size={12} /> {formatTime(nextLvlData.constructionTime)}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {nextLvlData.description && (
                                            <div style={{ padding: '12px 16px', fontSize: '12px', color: theme.colors.textMuted, fontStyle: 'italic', backgroundColor: 'rgba(15, 23, 42, 0.2)', borderBottom: `1px solid ${theme.colors.border}` }}>
                                                "{nextLvlData.description}"
                                            </div>
                                        )}

                                        {/* Action Bar (Moved UP) */}
                                        <div style={{ padding: '16px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleBuild(moduleName)}
                                                style={styles.btnPrimary(false)}
                                            >
                                                <Icons.Hammer size={20} /> Construct Level {nextLvlData.level}
                                            </button>
                                        </div>

                                        {/* Requirements Container */}
                                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                            {/* Skill Requirements */}
                                            {nextLvlData.skillRequirements && nextLvlData.skillRequirements.length > 0 && (
                                                <div>
                                                    <h3 style={styles.sectionTitle}>
                                                        <Icons.Book size={16} /> Required Skills
                                                    </h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                        {nextLvlData.skillRequirements.map(req => (
                                                            <div key={req.skill.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: theme.rounded, border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.bgCard }}>
                                                                <div style={{ width: '32px', height: '32px', backgroundColor: theme.colors.bgMain, borderRadius: '4px', padding: '2px' }}>
                                                                    <img src={req.skill.imageLink} alt={req.skill.name} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8 }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>{req.skill.name}</div>
                                                                    <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>Level {req.level}+</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Module Requirements */}
                                            {nextLvlData.moduleRequirements && nextLvlData.moduleRequirements.length > 0 && (
                                                <div>
                                                    <h3 style={styles.sectionTitle}>
                                                        <Icons.Component size={16} /> Required Modules
                                                    </h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                        {nextLvlData.moduleRequirements.map(req => {
                                                            const isTracked = currentLevels.hasOwnProperty(req.name);
                                                            const currentTrackedLevel = isTracked ? currentLevels[req.name] : 0;
                                                            const isMetAuto = isTracked && currentTrackedLevel >= req.level;
                                                            const isChecked = isTracked ? isMetAuto : isModuleReqChecked(moduleName, nextLvlData.level, req.id);

                                                            return (
                                                                <div
                                                                    key={req.id}
                                                                    onClick={() => {
                                                                        if (isTracked && req.name !== moduleName) scrollToModule(req.name);
                                                                        else if (!isTracked) toggleModuleReq(moduleName, nextLvlData.level, req.id);
                                                                    }}
                                                                    style={{
                                                                        ...styles.reqItem(isChecked),
                                                                        borderColor: isChecked ? theme.colors.success : theme.colors.border,
                                                                        backgroundColor: isChecked ? 'rgba(34, 197, 94, 0.05)' : theme.colors.bgCard,
                                                                        opacity: 1
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `1px solid ${isChecked ? theme.colors.success : theme.colors.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.success }}>
                                                                            {isChecked && <Icons.Check size={14} />}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '14px', fontWeight: '500', color: isChecked ? theme.colors.textMuted : '#e2e8f0' }}>{req.name}</div>
                                                                            <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>
                                                                                Level {req.level}
                                                                                {isTracked && <span style={{ marginLeft: '6px', color: isMetAuto ? theme.colors.success : theme.colors.danger }}>({currentTrackedLevel})</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Item Requirements */}
                                            <div>
                                                <h3 style={styles.sectionTitle}>
                                                    <Icons.Package size={16} /> Required Items
                                                </h3>
                                                <div style={{ display: 'grid', gap: '8px' }}>
                                                    {/* Sort items: Unchecked first, Checked last */}
                                                    {nextLvlData.itemRequirements
                                                        .slice()
                                                        .sort((a, b) => {
                                                            const isCheckedA = isItemChecked(moduleName, nextLvlData.level, a.item.id);
                                                            const isCheckedB = isItemChecked(moduleName, nextLvlData.level, b.item.id);
                                                            if (isCheckedA === isCheckedB) return 0;
                                                            return isCheckedA ? 1 : -1;
                                                        })
                                                        .map((req) => {
                                                            const isChecked = isItemChecked(moduleName, nextLvlData.level, req.item.id);
                                                            const isFir = req.attributes?.some(a => a.name === "foundInRaid" && a.value === "true");

                                                            return (
                                                                <div
                                                                    key={req.item.id}
                                                                    onClick={() => toggleItem(moduleName, nextLvlData.level, req.item.id)}
                                                                    style={styles.reqItem(isChecked)}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', border: `1px solid ${isChecked ? theme.colors.accent : theme.colors.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isChecked ? theme.colors.accent : 'transparent', color: '#fff' }}>
                                                                            {isChecked && <Icons.Check size={16} />}
                                                                        </div>
                                                                        <div style={{ width: '40px', height: '40px', backgroundColor: theme.colors.bgMain, borderRadius: '4px', border: `1px solid ${theme.colors.border}`, padding: '2px' }}>
                                                                            <img
                                                                                src={req.item.inspectImageLink || req.item.image512pxLink || req.item.imageLink}
                                                                                alt={req.item.name}
                                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: '500', color: isChecked ? theme.colors.textMuted : '#e2e8f0', textDecoration: isChecked ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                {req.item.name}
                                                                                {isFir && (
                                                                                    <div>
                                                                                        <div style={styles.firBadge} />
                                                                                        <Icons.Check size={15} color="#ffc400" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: 'monospace' }}>
                                                                                Quantity: <span style={{ color: theme.colors.accent }}>{req.count.toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isMaxLevel && (
                                    <div style={{ padding: '32px', textAlign: 'center', color: theme.colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
                                        <Icons.Check size={48} color={theme.colors.success} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                        <p style={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '14px' }}>Module Fully Upgraded</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ maxWidth: '1200px', margin: '48px auto 0', textAlign: 'center', color: theme.colors.textMuted, fontSize: '12px', fontFamily: 'monospace' }}>
                    DATA PROVIDED BY TARKOV.DEV • HIDEOUT MANAGER v1.0
                </div>
            </div>

            {/* Slide-out Sidebar - Shopping List Only */}
            <div style={styles.sidebar(isSidebarOpen)}>
                <div style={{ ...styles.sidebarHeader, flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{
                            display: 'flex', justifyContent: 'center', width: '100%', alignItems: 'center',
                            fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', gap: '8px', margin: 0
                        }}>
                            <Icons.Cart size={20} color={theme.colors.accent} />
                            Shopping List
                        </h2>
                        <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: theme.colors.textMuted, cursor: 'pointer' }}>
                            <Icons.Close size={24} />
                        </button>
                    </div>
                    <div style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', }}>
                        <label style={styles.checkboxWrapper}>
                            <input
                                type="checkbox"
                                checked={showFirOnly}
                                onChange={(e) => setShowFirOnly(e.target.checked)}
                                style={styles.checkbox}
                            />
                            <span style={{ fontSize: '12px' }}>Show Only FIR Items</span>
                        </label>
                        <label style={styles.checkboxWrapper}>
                            <input
                                type="checkbox"
                                checked={showUseInModule}
                                onChange={(e) => setShowUseInModule(e.target.checked)}
                                style={styles.checkbox}
                            />
                            <span style={{ fontSize: '12px' }}>Show Use In Modules</span>
                        </label>
                    </div>
                </div>

                <div style={{ padding: '24px' }}>
                    {shoppingList.filter(item => !showFirOnly || item.isFir).length === 0 ? (
                        <div style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '32px 0', fontSize: '14px' }}>
                            {showFirOnly ? "No pending FIR items needed." : "No pending items needed."}
                            <br />
                            <span style={{ fontSize: '12px', opacity: 0.6 }}>Unlock more modules or finish building to see items here.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {shoppingList.filter(item => !showFirOnly || item.isFir).map((item, index) => {
                                const isJustCopied = copiedKeyIndex === index
                                return (
                                    <div key={item.uniqueKey}
                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}
                                        onClick={() => handleCopyName(item.name, index)}>
                                        <div style={{ width: '100px', height: '100px', backgroundColor: theme.colors.bgMain, borderRadius: '4px', border: `1px solid ${theme.colors.border}`, padding: '2px', flexShrink: 0 }}>
                                            <img
                                                src={item.inspectImageLink || item.image512pxLink || item.imageLink}
                                                alt={item.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{
                                                fontWeight: 'bold', fontSize: '14px', color: isJustCopied ? '#ffc400' : '#e2e8f0',
                                                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s ease'
                                            }}>
                                                {item.name}
                                                {item.isFir && (
                                                    <div>
                                                        <div style={styles.firBadge} />
                                                        <Icons.Check size={15} color="#ffc400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: theme.colors.accent, fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                Need: {item.total.toLocaleString()}
                                            </div>
                                            {showUseInModule && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {item.from.map((source, i) => (
                                                        <span key={i} style={{ fontSize: '10px', backgroundColor: theme.colors.bgCard, padding: '2px 6px', borderRadius: '4px', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}` }}>
                                                            {source}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Hideout;