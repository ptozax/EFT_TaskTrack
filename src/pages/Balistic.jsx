import React, { useState, useMemo } from 'react';
import ammo from '../data/ammo.json';
import { AmmoStyles as styles, Icons } from '../Component/EftComponent';

// Helper Component for Table Rows to handle Hover state properly with inline styles
const HoverRow = ({ children, onClick, style }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <tr
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                ...styles.row,
                ...style,
                backgroundColor: isHovered ? 'rgba(39, 39, 42, 0.5)' : 'transparent', // zinc-800/50
            }}
        >
            {children}
        </tr>
    );
};


const Modal = ({ item, onClose }) => {
    if (!item) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <button
                    onClick={onClose}
                    style={styles.closeButton}
                >
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
                        <div style={{ flexGrow: 1 }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem', margin: 0 }}>{item.item.name}</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span style={styles.pill}>
                                    {item.caliber.replace('Caliber', '')}
                                </span>
                                <span style={styles.pill}>
                                    {item.ammoType}
                                </span>
                                {item.tracer && (
                                    <span style={styles.tracerPill}>
                                        <Icons.Crosshair size={12} /> Tracer ({item.tracerColor})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <h3 style={styles.sectionTitle}>
                                <Icons.ShieldAlert size={18} style={{ color: '#60a5fa' }} /> Ballistics
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Damage</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f87171' }}>{item.damage}</div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Penetration</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#60a5fa' }}>{item.penetrationPower}</div>
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

// --- EFFECTIVENESS LOGIC ---
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

const getEffectivenessStyle = (score) => {
    const baseStyle = {
        fontWeight: 'bold',
        width: '2rem',
        height: '2rem',
        borderRadius: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.875rem',
        margin: '0 auto'
    };
    switch (score) {
        case 6: return { ...baseStyle, backgroundColor: '#00FF00', color: 'black' };
        case 5: return { ...baseStyle, backgroundColor: '#90EE90', color: 'black' };
        case 4: return { ...baseStyle, backgroundColor: '#FFFF00', color: 'black' };
        case 3: return { ...baseStyle, backgroundColor: '#FFA500', color: 'black' };
        case 2: return { ...baseStyle, backgroundColor: '#FF0000', color: 'white' };
        case 1: return { ...baseStyle, backgroundColor: '#8B0000', color: 'white' };
        default: return { ...baseStyle, backgroundColor: '#2A2A2A', color: '#52525b' };
    }
};

const Legend = () => (
    <div style={styles.legendContainer}>
        <h3 style={styles.legendTitle}>
            <Icons.HelpCircle size={16} /> Effectiveness Legend
        </h3>
        <div style={styles.legendGrid}>
            <div style={{ ...getEffectivenessStyle(6), width: 'auto', padding: '0.5rem' }}>6: Usually Ignores</div>
            <div style={{ ...getEffectivenessStyle(5), width: 'auto', padding: '0.5rem' }}>5: Very Effective</div>
            <div style={{ ...getEffectivenessStyle(4), width: 'auto', padding: '0.5rem' }}>4: Effective</div>
            <div style={{ ...getEffectivenessStyle(3), width: 'auto', padding: '0.5rem' }}>3: Slightly Effective</div>
            <div style={{ ...getEffectivenessStyle(2), width: 'auto', padding: '0.5rem' }}>2: Magdump Only</div>
            <div style={{ ...getEffectivenessStyle(1), width: 'auto', padding: '0.5rem' }}>1: Possible...</div>
            <div style={{ ...getEffectivenessStyle(0), width: 'auto', padding: '0.5rem' }}>0: Pointless</div>
        </div>
    </div>
);

const Ammo = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCaliber, setSelectedCaliber] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'penetrationPower', direction: 'desc' });
    const [selectedItem, setSelectedItem] = useState(null);
    const [showLegend, setShowLegend] = useState(true);

    const calibers = useMemo(() => {
        const unique = new Set(ammo.map(item => item.caliber));
        return ['All', ...Array.from(unique).sort()];
    }, []);

    const filteredData = useMemo(() => {
        let data = [...ammo];

        if (selectedCaliber !== 'All') {
            data = data.filter(item => item.caliber === selectedCaliber);
        }

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            data = data.filter(item =>
                item.item.name.toLowerCase().includes(lowerSearch) ||
                item.item.normalizedName.toLowerCase().includes(lowerSearch)
            );
        }

        if (sortConfig.key) {
            data.sort((a, b) => {
                let aValue = sortConfig.key.includes('.') ? a.item.name : a[sortConfig.key];
                let bValue = sortConfig.key.includes('.') ? b.item.name : b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [searchTerm, selectedCaliber, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <div style={{ width: '1rem', height: '1rem', marginLeft: '0.25rem', opacity: 0, display: 'inline-block' }}><Icons.ChevronDown size={14} /></div>;
        return <div style={{ width: '1rem', height: '1rem', marginLeft: '0.25rem', display: 'inline-block', color: '#60a5fa' }}>{sortConfig.direction === 'asc' ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}</div>;
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div style={styles.headerFlex}>
                        <div style={styles.logoSection}>
                            <div style={styles.logoIcon}>
                                <Icons.Crosshair color="white" size={24} />
                            </div>
                            <div>
                                <h1 style={styles.title}>Ballistics<span style={{ color: '#3b82f6' }}>Viewer</span></h1>
                                <p style={styles.subtitle}>Tarkov Ammo Chart</p>
                            </div>
                        </div>

                        <div style={styles.controlsSection}>
                            <div style={styles.searchContainer}>
                                <div style={styles.searchIcon}>
                                    <Icons.Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search ammo..."
                                    style={styles.searchInput}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = '#3f3f46'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>

                            <select
                                style={styles.caliberSelect}
                                value={selectedCaliber}
                                onChange={(e) => setSelectedCaliber(e.target.value)}
                                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#3f3f46'; e.target.style.boxShadow = 'none'; }}
                            >
                                {calibers.map(cal => (
                                    <option key={cal} value={cal}>{cal === 'All' ? 'All Calibers' : cal.replace('Caliber', '')}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>

                {/* Legend Toggle */}
                <div style={styles.legendToggle}>
                    <button
                        onClick={() => setShowLegend(!showLegend)}
                        style={styles.legendButton}
                    >
                        {showLegend ? 'Hide Legend' : 'Show Legend'}
                    </button>
                </div>

                {showLegend && <Legend />}

                <div style={styles.tableContainer}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, textAlign: 'center', width: '4rem' }}>Icon</th>
                                    <th
                                        style={styles.th}
                                        onClick={() => handleSort('item.name')}
                                    >
                                        Name <SortIcon column="item.name" />
                                    </th>
                                    <th
                                        style={{ ...styles.th, textAlign: 'center' }}
                                        onClick={() => handleSort('damage')}
                                    >
                                        Dmg <SortIcon column="damage" />
                                    </th>
                                    <th
                                        style={{ ...styles.th, textAlign: 'center' }}
                                        onClick={() => handleSort('penetrationPower')}
                                    >
                                        Pen <SortIcon column="penetrationPower" />
                                    </th>
                                    <th
                                        style={{ ...styles.th, textAlign: 'center' }}
                                        onClick={() => handleSort('armorDamage')}
                                    >
                                        Arm % <SortIcon column="armorDamage" />
                                    </th>

                                    {/* Armor Class Columns */}
                                    <th style={{ ...styles.armorHeader, borderLeft: '1px solid #27272a' }}>1</th>
                                    <th style={styles.armorHeader}>2</th>
                                    <th style={styles.armorHeader}>3</th>
                                    <th style={styles.armorHeader}>4</th>
                                    <th style={styles.armorHeader}>5</th>
                                    <th style={{ ...styles.armorHeader, borderRight: '1px solid #27272a' }}>6</th>

                                    <th style={{ ...styles.th, textAlign: 'center', width: '3rem' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => {
                                    const scores = [1, 2, 3, 4, 5, 6].map(ac => getEffectivenessScore(item.penetrationPower, ac));

                                    return (
                                        <HoverRow
                                            key={item.item.id}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <td style={styles.td}>
                                                <div style={styles.iconCell}>
                                                    <img src={item.item.iconLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{ fontWeight: '500', color: '#e4e4e7' }}>{item.item.name}</div>
                                                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: '#71717a', fontWeight: '700' }}>{item.caliber.replace('Caliber', '')}</div>
                                            </td>

                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <div style={{ color: '#e4e4e7', fontFamily: 'monospace', fontWeight: '700' }}>{item.damage}</div>
                                            </td>

                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <div style={{ color: '#e4e4e7', fontFamily: 'monospace', fontWeight: '700' }}>{item.penetrationPower}</div>
                                            </td>

                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <div style={{ color: '#a1a1aa', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.armorDamage}%</div>
                                            </td>

                                            {/* Effectiveness Grid */}
                                            {scores.map((score, index) => (
                                                <td key={index} style={{ padding: '0.25rem', textAlign: 'center', borderBottom: '1px solid #27272a' }}>
                                                    <div style={getEffectivenessStyle(score)}>
                                                        {score}
                                                    </div>
                                                </td>
                                            ))}

                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button style={{ color: '#52525b', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Icons.Info size={16} />
                                                </button>
                                            </td>
                                        </HoverRow>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filteredData.length === 0 && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#71717a' }}>
                            No ammo found matching your criteria.
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Modal */}
            <Modal item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>
    );
}

export default Ammo;