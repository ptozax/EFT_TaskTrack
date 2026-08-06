import React, { useState, useEffect, useMemo } from 'react';
import questsStatic from "../data/tasks";
import { useLiveData } from '../data/gameStore';
import { kappaStyles as styles, Icons, COLORS } from '../Component/EftComponent';
import * as QuestComponent from '../Component/QuestComponent';
// --- Components ---
const ProgressBar = ({ current, total, color = COLORS.accent }) => {
    const percentage = total === 0 ? 0 : Math.round((current / total) * 100);

    return (
        <div style={styles.containerStyle}>
            <div style={{ ...styles.fillStyle, width: `${percentage}%`, backgroundColor: color, }} />
        </div>
    );
};

const TraderSection = ({ traderName, quests, completedIds, onToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const total = quests.length;
    const completedCount = quests.filter(quest => completedIds.find(q => q.id === quest.id)).length;
    const isAllComplete = total > 0 && total === completedCount;

    return (
        <div style={styles.cardStyle}>
            <div
                style={{ ...styles.headerStyle, borderBottom: isExpanded ? `1px solid ${COLORS.border}` : 'none', }}
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Click to collapse" : "Click to expand"}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        ...styles.avatarStyle, backgroundColor: isAllComplete ? COLORS.success : '#374151',
                        color: isAllComplete ? '#ffffff' : '#d1d5db',
                    }}>
                        {traderName.charAt(0)}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: COLORS.textPrimary, margin: 0 }}>
                            {traderName}
                        </h2>
                        <div style={{ fontSize: '0.875rem', color: COLORS.textSecondary }}>
                            {completedCount} / {total} Completed
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1, justifyContent: 'flex-end', minWidth: '200px' }}>
                    <div style={{ flexGrow: 1, maxWidth: '300px' }}>
                        <ProgressBar current={completedCount} total={total} color={isAllComplete ? COLORS.success : COLORS.blue} />
                    </div>
                    <div style={{ color: COLORS.textSecondary, display: 'flex', alignItems: 'center' }}>
                        {isExpanded ? <Icons.ChevronUp size={20} /> : <Icons.ChevronDown size={20} />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div>
                    {quests.map((quest) => {
                        const isDone = completedIds.find(q => q.id === quest.id);
                        const isComplete = isDone && isDone.status === 'complete'

                        return (
                            <div key={quest.id} style={{ ...styles.rowStyle, backgroundColor: isDone ? 'rgba(31, 41, 55, 0.5)' : 'transparent', }}>
                                <button
                                    onClick={() => onToggle(quest.id)}
                                    style={{
                                        ...styles.checkboxStyle, border: isDone ? `1px solid ${isComplete ? COLORS.success : COLORS.danger}` : '1px solid #6b7280',
                                        backgroundColor: isDone ? (isComplete ? COLORS.success : COLORS.danger) : COLORS.bgHeader,
                                        color: isDone ? '#ffffff' : 'transparent',
                                    }}
                                >
                                    {/* <CheckIcon size={16} />  */}
                                    {isDone && isComplete ? <Icons.Check size={16} /> : < Icons.Cross size={16} />}
                                </button>

                                <div style={{ flexGrow: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h3 style={{
                                            fontWeight: '600',
                                            fontSize: '1.125rem',
                                            margin: 0,
                                            color: isDone ? COLORS.textSecondary : COLORS.textPrimary,
                                            textDecoration: isDone ? 'line-through' : 'none'
                                        }}>
                                            {quest.name}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                            {quest.minPlayerLevel > 1 && (
                                                <span style={{ ...styles.badgeStyle, color: '#d1d5db' }}>
                                                    Lvl {quest.minPlayerLevel}
                                                </span>
                                            )}
                                            <span style={{ ...styles.badgeStyle, color: '#facc15' }}>
                                                {quest.experience} XP
                                            </span>
                                            <a
                                                href={quest.wikiLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#60a5fa', padding: '0.25rem' }}
                                                title="View on Wiki"
                                            >
                                                <Icons.ExternalLink size={16} />
                                            </a>
                                        </div>
                                    </div>

                                    {!isDone && (
                                        <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #374151', listStyle: 'none' }}>
                                            {quest.objectives.map((obj, idx) => (
                                                <li key={idx} style={{ fontSize: '0.875rem', color: COLORS.textSecondary, marginBottom: '0.25rem' }}>
                                                    {obj.description}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Kappa = () => {
    const quests = useLiveData(questsStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static
    // --- State Management ---
    const [completedIds, setCompletedIds] = useState(() => {
        const savedCompleted = localStorage.getItem('eft_completed_quests');
        return savedCompleted ? JSON.parse(savedCompleted) : []
    });

    const [isRefresh, setIsRefresh] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCompleted, setShowCompleted] = useState(true);

    useEffect(() => {
        const handleStorageChange = () => {
            try {

                const savedCompleted = localStorage.getItem('eft_completed_quests');
                setCompletedIds(savedCompleted ? JSON.parse(savedCompleted) : []);
            } catch (err) {
                console.error(err);
            }
        }
        setIsRefresh(true);
        // Add listener
        window.addEventListener("storage", handleStorageChange);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, []);

    useEffect(() => {
        if (isRefresh) localStorage.setItem('eft_completed_quests', JSON.stringify(completedIds));
    }, [completedIds, isRefresh]);

    const toggleQuest = (id) => {
        const newCompleted = QuestComponent.getPreviousQuestsList(id, completedIds);

        const nextQuestList = QuestComponent.getNextQuestLists(completedIds, id);
        // console.log(newCompleted, nextQuestList);

        if (newCompleted.length > 0) {
            setCompletedIds(prev => {
                const uniqueSet = new Set([...prev, ...newCompleted]);
                return Array.from(uniqueSet);
            });
        }
        if (newCompleted.length === 0 && nextQuestList.length > 0) {
            setCompletedIds(prev => prev.filter(q => q.id !== id));
        }
    };

    // --- Data Processing ---
    const filteredQuests = useMemo(() => {
        return quests.filter(quest => {
            if (!quest.kappaRequired) return false;
            if (searchTerm && !quest.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (!showCompleted && completedIds.find(q => q.id === quest.id)) return false;
            return true;
        });
    }, [searchTerm, showCompleted, completedIds]);

    const questsByTrader = useMemo(() => {
        const groups = {};
        filteredQuests.forEach(quest => {
            const traderName = quest.trader.name;
            if (!groups[traderName]) {
                groups[traderName] = [];
            }
            groups[traderName].push(quest);
        });
        return groups;
    }, [filteredQuests]);

    const totalKappaQuests = quests.filter(q => q.kappaRequired).length;
    const totalCompleted = completedIds.length;
    const traderNames = Object.keys(questsByTrader);

    return (
        <div style={styles.appContainerStyle}>

            {/* Header */}
            <header style={styles.stickyHeaderStyle}>
                <div style={{ ...styles.contentWrapperStyle, padding: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ backgroundColor: '#ca8a04', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>
                                <Icons.Trophy size={24} style={{ color: 'white' }} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: 1.2, margin: 0 }}>Kappa Tracker</h1>
                                <p style={{ fontSize: '0.75rem', color: COLORS.textSecondary, fontFamily: 'monospace', letterSpacing: '0.05em', margin: 0 }}>ESCAPE FROM TARKOV</p>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            backgroundColor: COLORS.bgCard,
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            border: `1px solid ${COLORS.border}`,
                            flexGrow: 1,
                            maxWidth: '400px'
                        }}>
                            <div style={{ flexGrow: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', color: COLORS.textSecondary }}>
                                    <span>Kappa Progress</span>
                                    <span>{Math.round((totalCompleted / totalKappaQuests) * 100)}%</span>
                                </div>
                                <ProgressBar current={totalCompleted} total={totalKappaQuests} color={COLORS.accent} />
                            </div>
                            <div style={{ textAlign: 'right', paddingLeft: '1rem', borderLeft: `1px solid ${COLORS.border}` }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', lineHeight: 1 }}>{totalCompleted}</div>
                                <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', color: COLORS.textSecondary }}>Done</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ ...styles.contentWrapperStyle, paddingTop: '2rem' }}>

                {/* Controls */}
                <div style={styles.controlBarStyle}>
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                        <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: COLORS.textSecondary }}>
                            <Icons.Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search quests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.inputStyle}
                        />
                    </div>

                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{ ...styles.buttonStyle, backgroundColor: showCompleted ? COLORS.bgCard : '#374151', }}
                    >
                        <Icons.Filter size={18} />
                        <span>{showCompleted ? 'Hide Completed' : 'Show Completed'}</span>
                    </button>
                </div>

                {/* Quest List */}
                {traderNames.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '5rem 0',
                        backgroundColor: 'rgba(17, 24, 39, 0.5)',
                        borderRadius: '0.5rem',
                        border: `1px dashed ${COLORS.border}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: COLORS.textSecondary }}>
                            <Icons.Trophy size={48} />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: COLORS.textSecondary, margin: 0 }}>No quests found</h3>
                        <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div>
                        {traderNames.map(trader => (
                            <TraderSection
                                key={trader}
                                traderName={trader}
                                quests={questsByTrader[trader]}
                                completedIds={completedIds}
                                onToggle={toggleQuest}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: `1px solid ${COLORS.border}`,
                marginTop: '3rem',
                padding: '2rem 0',
                textAlign: 'center',
                color: COLORS.textSecondary,
                fontSize: '0.875rem'
            }}>
                <p>Data based on provided sample. Not affiliated with Battlestate Games.</p>
            </footer>
        </div>
    );
}
export default Kappa;