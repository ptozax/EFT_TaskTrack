import React, { useState, useEffect, useMemo, useCallback } from 'react';
import storyData from "../data/story.json";
import { kappaStyles as styles, Icons, COLORS } from '../Component/EftComponent';

/* หน้า Story chapters — 10 บทเนื้อเรื่องทางการของ Tarkov ที่จบด้วย 1 ใน 4 endings
   ข้อมูลมาจาก EFT Wiki ผ่าน scripts/update-story.mjs -> src/data/story.json
   (story chapter ไม่ใช่เควสของ trader จึงไม่มีใน json.tarkov.dev เลย)

   ความคืบหน้าเก็บแยกคีย์ของตัวเอง: eft_story_progress
   = { [chapterId]: { [objectiveIndex]: true } }  ไม่ยุ่งกับ eft_completed_quests

   รูป banner/icon โหลดเก็บไว้ที่ public/story/ ตอน build -> เสิร์ฟจากโดเมนเราเอง
   ไม่ยิง CDN ของ Fandom (เขาบล็อก hotlink) */

const STORAGE_KEY = 'eft_story_progress';
const VIEW_KEY = 'eft_story_view';
const CHAPTER_KEY = 'eft_story_chapter';

/* เก็บความคืบหน้าโดยอ้างจาก "ข้อความของขั้น" ไม่ใช่ลำดับที่
   เพราะข้อมูลถูกดึงใหม่จากวิกิได้ ถ้าวิกิแทรก/สลับขั้น การอ้าง index
   จะทำให้ของที่ติ๊กไว้เลื่อนไปโดนขั้นอื่น */
const stepKey = (step) => {
    const norm = (step?.text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    let h = 5381;
    for (let i = 0; i < norm.length; i += 1) h = (((h << 5) + h + norm.charCodeAt(i)) >>> 0);
    return h.toString(36);
};
const ACCENT = '#a78bfa';   // ม่วงประจำหน้า Story
const ACCENT_DIM = 'rgba(167, 139, 250, 0.15)';

// หน้านี้เป็น 2 คอลัมน์ (สารบัญ + เนื้อหา) ถ้าใช้ contentWrapperStyle ที่แชร์กัน
// (maxWidth 1024px) เนื้อหาจะเหลือแค่ ~660px แล้วดูอึดอัด -> ใช้กรอบกว้างกว่าเฉพาะหน้านี้
const WRAP = { maxWidth: '1560px', margin: '0 auto', padding: '1rem 1.5rem' };
// grid ที่ยืดเต็มความกว้างเมื่อจอกว้าง และยุบเป็นคอลัมน์เดียวเองเมื่อจอแคบ
const AUTO_GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' };

const loadProgress = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (err) {
        console.error(err);
        return {};
    }
};

const ChapterImage = ({ file, alt = '', style, lazy = true }) => {
    if (!file) return null;
    return (
        <img
            src={`${import.meta.env.BASE_URL}${file}`}
            alt={alt}
            style={style}
            loading={lazy ? 'lazy' : undefined}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
    );
};

const Bar = ({ value, total, color = ACCENT, height = 6 }) => (
    <div style={{ width: '100%', height, backgroundColor: '#0b1120', borderRadius: height, overflow: 'hidden' }}>
        <div style={{
            height: '100%', borderRadius: height, backgroundColor: color,
            width: `${total ? Math.round((value / total) * 100) : 0}%`, transition: 'width 0.25s ease',
        }} />
    </div>
);

const Chip = ({ children, color = COLORS.textSecondary, bg = 'rgba(148, 163, 184, 0.12)', wrap = false }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.45rem',
        borderRadius: '999px', fontSize: '0.7rem', color, backgroundColor: bg,
        // ป้ายสั้น ๆ ไม่ให้ตัดบรรทัด แต่ของยาว (ชื่อรางวัลถึง 63 ตัวอักษร) ต้องตัดได้
        // ไม่งั้นบนมือถือจะดันหน้าจอให้เลื่อนซ้ายขวา
        whiteSpace: wrap ? 'normal' : 'nowrap', maxWidth: '100%',
    }}>
        {children}
    </span>
);

// สรุปโครงของบท: ขั้นบังคับ/ไม่บังคับ และทางแยกที่ระบุว่าพาไปตอนจบไหน
const chapterFacts = (chapter) => {
    const required = chapter.objectives.filter((o) => !o.optional);
    const optional = chapter.objectives.filter((o) => o.optional);
    const forks = [];
    const forkEndings = [];
    chapter.objectives.forEach((o) => {
        if (o.branch && !forks.includes(o.branch)) forks.push(o.branch);
        (o.branchEndings || []).forEach((e) => { if (!forkEndings.includes(e)) forkEndings.push(e); });
    });
    return { required, optional, forks, forkEndings };
};

/* ---------- สารบัญด้านซ้าย ---------- */
const ChapterRow = ({ chapter, done, total, forks, isActive, index, onSelect }) => {
    const [hover, setHover] = useState(false);
    const complete = total > 0 && done >= total;
    const started = done > 0 && !complete;

    return (
        <button
            onClick={onSelect}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', gap: '0.6rem', alignItems: 'center', width: '100%', textAlign: 'left',
                padding: '0.5rem', marginBottom: '0.3rem', cursor: 'pointer', borderRadius: '0.5rem',
                color: COLORS.textPrimary, transition: 'background-color 0.15s ease, border-color 0.15s ease',
                backgroundColor: isActive ? ACCENT_DIM : hover ? 'rgba(148, 163, 184, 0.08)' : 'transparent',
                border: `1px solid ${isActive ? ACCENT : 'transparent'}`,
            }}
        >
            <span style={{
                width: '1.5rem', height: '1.5rem', flexShrink: 0, borderRadius: '50%', fontSize: '0.7rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                backgroundColor: complete ? COLORS.success : started ? ACCENT : '#0b1120',
                color: complete || started ? '#0b1120' : COLORS.textSecondary,
                border: `1px solid ${complete ? COLORS.success : started ? ACCENT : COLORS.border}`,
            }}>
                {complete ? <Icons.Check size={12} /> : index + 1}
            </span>

            <ChapterImage
                file={chapter.iconFile} alt=""
                style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0, opacity: complete ? 0.6 : 1 }}
            />

            <span style={{ flexGrow: 1, minWidth: 0 }}>
                <span style={{
                    display: 'block', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    color: complete ? COLORS.textSecondary : COLORS.textPrimary,
                }}>
                    {chapter.name}
                </span>
                <span style={{ display: 'block', marginTop: '0.25rem' }}>
                    <Bar value={done} total={total} color={complete ? COLORS.success : ACCENT} height={4} />
                </span>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                {forks > 0 && (
                    <span title={`${forks} story forks in this chapter`} style={{ color: ACCENT, display: 'flex' }}>
                        <Icons.Component size={12} />
                    </span>
                )}
                <span style={{ fontSize: '0.7rem', color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                    {done}/{total}
                </span>
            </span>
        </button>
    );
};

/* ---------- รายละเอียดของขั้น: ไปที่ไหน ใช้อะไร ทำอะไร ---------- */
const StepDetail = ({ step }) => {
    const nothing = !step.detail && !step.items.length && !step.sub.length;
    if (nothing) {
        return (
            <div style={{ fontSize: '0.82rem', color: COLORS.textSecondary, padding: '0.1rem 0 0.3rem' }}>
                No walkthrough for this step on the wiki yet.
            </div>
        );
    }
    return (
        <div style={{ padding: '0.15rem 0 0.4rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {step.detail && (
                <div style={{ fontSize: '0.86rem', lineHeight: 1.6, color: COLORS.textSecondary, whiteSpace: 'pre-line', maxWidth: '92ch' }}>
                    {step.detail}
                </div>
            )}

            {step.sub.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '0.9rem', borderLeft: `2px solid ${COLORS.border}`, listStyle: 'none' }}>
                    {step.sub.map((sub, i) => (
                        <li key={i} style={{ fontSize: '0.84rem', color: COLORS.textSecondary, marginBottom: '0.15rem' }}>
                            {sub.text}{sub.optional ? ' (optional)' : ''}
                        </li>
                    ))}
                </ul>
            )}

            {step.items.length > 0 && (
                <div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.accent, marginBottom: '0.25rem' }}>
                        Items needed
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {step.items.map((it, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.84rem', flexWrap: 'wrap' }}>
                                <span style={{ color: COLORS.textPrimary }}>
                                    {it.amount && it.amount !== '1' ? `${it.amount}× ` : ''}{it.name}
                                </span>
                                {it.requirement && <Chip>{it.requirement}</Chip>}
                                {it.foundInRaid && <Chip color="#fca5a5" bg="rgba(239,68,68,0.14)">Found in raid</Chip>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ป้ายย่อบนหัวแถว บอกที่ตั้ง/คนสั่ง/จำนวนไอเทม โดยไม่ต้องกางรายละเอียด
const StepTags = ({ step }) => (
    <>
        {step.maps.map((m) => <Chip key={m} color="#93c5fd" bg="rgba(147,197,253,0.12)">{m}</Chip>)}
        {step.traders.map((t) => <Chip key={t} color="#fcd34d" bg="rgba(252,211,77,0.12)">{t}</Chip>)}
        {step.items.length > 0 && <Chip color={COLORS.textPrimary}><Icons.Package size={11} /> {step.items.length}</Chip>}
        {step.optional && <Chip color="#93c5fd" bg="rgba(147, 197, 253, 0.12)">Optional</Chip>}
    </>
);

/* ---------- แถวขั้นตอน: กล่องติ๊ก = ทำเสร็จ / กดที่แถว = กางรายละเอียด ---------- */
const StepRow = ({ step, index, isDone, isCurrent, expanded, onToggleDone, onToggleExpand }) => {
    const [hover, setHover] = useState(false);
    const hasDetail = !!(step.detail || step.items.length || step.sub.length);

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                borderBottom: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${isCurrent ? ACCENT : 'transparent'}`,
                backgroundColor: isDone ? 'rgba(34, 197, 94, 0.05)' : hover ? 'rgba(148, 163, 184, 0.05)' : 'transparent',
                transition: 'background-color 0.15s ease',
            }}
        >
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', padding: '0.55rem 0.9rem' }}>
                <button
                    onClick={onToggleDone}
                    title={isDone ? 'Mark as not done' : 'Mark as done'}
                    style={{
                        width: '1.35rem', height: '1.35rem', flexShrink: 0, marginTop: '0.1rem', borderRadius: '0.35rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                        backgroundColor: isDone ? COLORS.success : 'transparent',
                        border: `1px solid ${isDone ? COLORS.success : hover ? ACCENT : '#4b5563'}`,
                        color: isDone ? '#0b1120' : 'transparent',
                    }}
                >
                    <Icons.Check size={13} />
                </button>

                <div
                    onClick={hasDetail ? onToggleExpand : undefined}
                    style={{ flexGrow: 1, minWidth: 0, cursor: hasDetail ? 'pointer' : 'default' }}
                >
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: COLORS.textSecondary, fontFamily: 'monospace' }}>
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span style={{
                            fontSize: '0.92rem', lineHeight: 1.45, maxWidth: '86ch',
                            color: isDone ? COLORS.textSecondary : COLORS.textPrimary,
                            textDecoration: isDone ? 'line-through' : 'none',
                        }}>
                            {step.text}
                        </span>
                        <StepTags step={step} />
                    </div>
                    {expanded && <StepDetail step={step} />}
                </div>

                {hasDetail && (
                    <button
                        onClick={onToggleExpand}
                        title={expanded ? 'Hide details' : 'Show details'}
                        style={{
                            flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem',
                            color: expanded ? ACCENT : COLORS.textSecondary,
                        }}
                    >
                        {expanded ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
};

/* ---------- การ์ด "ขั้นที่ต้องทำตอนนี้" กันการเลื่อนหาที่ค้างไว้ ---------- */
const FocusCard = ({ step, index, total, onDone, chapterComplete }) => {
    if (chapterComplete) {
        return (
            <div style={{
                ...styles.cardStyle, marginBottom: '0.9rem', padding: '0.9rem 1rem',
                display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: `3px solid ${COLORS.success}`,
            }}>
                <Icons.Trophy size={18} style={{ color: COLORS.success }} />
                <span style={{ fontSize: '0.92rem', color: COLORS.textPrimary }}>
                    Chapter complete — all {total} steps done.
                </span>
            </div>
        );
    }
    if (!step) return null;

    return (
        <div style={{ ...styles.cardStyle, marginBottom: '0.9rem', borderLeft: `3px solid ${ACCENT}`, padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: ACCENT }}>
                    Up next · step {index + 1} of {total}
                </span>
                <span style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}><StepTags step={step} /></span>
            </div>

            <div style={{ fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.4, color: COLORS.textPrimary, maxWidth: '80ch' }}>
                {step.text}
            </div>

            <div style={{ marginTop: '0.4rem' }}><StepDetail step={step} /></div>

            <button
                onClick={onDone}
                style={{
                    ...styles.buttonStyle, fontSize: '0.82rem', marginTop: '0.2rem',
                    backgroundColor: 'rgba(34,197,94,0.15)', border: `1px solid ${COLORS.success}`, color: COLORS.success,
                }}
            >
                <Icons.Check size={14} /> <span>Done — next step</span>
            </button>
        </div>
    );
};

/* ---------- แผงตอนจบแบบแท็บ ---------- */
const EndingsPanel = ({ endings, intro, flowchart, flowchartCredit, wikiLink }) => {
    const [active, setActive] = useState(endings[0]?.name);
    const ending = endings.find((e) => e.name === active) || endings[0];
    if (!ending) return null;

    return (
        <div style={{ ...styles.cardStyle, marginTop: '1.5rem' }}>
            <div style={{ padding: '0.9rem 1rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Icons.Trophy size={20} style={{ color: COLORS.accent }} />
                <div style={{ flexGrow: 1, minWidth: '180px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Endings</h2>
                    <div style={{ fontSize: '0.76rem', color: COLORS.textSecondary }}>
                        The final stage of the story — your choices are permanent
                    </div>
                </div>
                <a href={wikiLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Icons.ExternalLink size={13} /> Wiki
                </a>
            </div>

            {intro && (
                <p style={{ margin: 0, padding: '0.85rem 1rem', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '95ch', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.border}` }}>
                    {intro}
                </p>
            )}

            {/* แท็บเลือกตอนจบ */}
            <div style={{ display: 'flex', gap: '0.35rem', padding: '0.7rem 1rem 0', flexWrap: 'wrap' }}>
                {endings.map((e) => {
                    const on = e.name === ending.name;
                    return (
                        <button
                            key={e.name}
                            onClick={() => setActive(e.name)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                                padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600,
                                backgroundColor: on ? ACCENT_DIM : 'transparent',
                                border: `1px solid ${on ? ACCENT : COLORS.border}`,
                                color: on ? COLORS.textPrimary : COLORS.textSecondary,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <ChapterImage file={e.iconFile} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                            {e.name}
                        </button>
                    );
                })}
            </div>

            <div style={{ padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                    <ChapterImage file={ending.iconFile} alt={ending.name} style={{ width: 64, height: 64, objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                        {ending.headline && (
                            <div style={{ fontSize: '0.95rem', fontStyle: 'italic', color: COLORS.textPrimary }}>“{ending.headline}”</div>
                        )}
                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.87rem', lineHeight: 1.6, color: COLORS.textSecondary }}>
                            {ending.description}
                        </p>
                    </div>
                </div>

                {/* เส้นทาง + รางวัล วางคู่กันเมื่อจอกว้าง (grid ยุบเองเมื่อแคบ) */}
                <div style={{ ...AUTO_GRID, marginTop: '1rem', alignItems: 'start' }}>
                <div style={{ padding: '0.75rem 0.9rem', borderRadius: '0.5rem', backgroundColor: 'rgba(11, 17, 32, 0.6)', border: `1px solid ${COLORS.border}` }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: ACCENT, marginBottom: '0.4rem' }}>
                        How to get this ending
                    </div>
                    {ending.route.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>The wiki does not list conditions for this ending.</div>
                    ) : (
                        <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.87rem', lineHeight: 1.6, color: COLORS.textPrimary }}>
                            {ending.route.map((r, i) => (
                                <li key={i}>
                                    {r.condition}
                                    {' '}<Chip>{r.chapter}</Chip>
                                </li>
                            ))}
                        </ol>
                    )}
                    {flowchart && (
                        <a
                            href={`${import.meta.env.BASE_URL}${flowchart}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.78rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.6rem' }}
                        >
                            <Icons.ExternalLink size={13} /> Open full-resolution flowchart (1653×3890)
                        </a>
                    )}
                    {flowchartCredit && (
                        <div style={{ fontSize: '0.7rem', color: COLORS.textSecondary, marginTop: '0.25rem' }}>
                            Flowchart by {flowchartCredit}
                        </div>
                    )}
                </div>

                {ending.rewards.length > 0 && (
                    <div style={{ padding: '0.75rem 0.9rem', borderRadius: '0.5rem', backgroundColor: 'rgba(11, 17, 32, 0.6)', border: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.accent, marginBottom: '0.4rem' }}>
                            Rewards ({ending.rewards.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {ending.rewards.map((r, i) => <Chip key={i} color={COLORS.textPrimary} wrap>{r}</Chip>)}
                        </div>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

/* ---------- หน้าหลัก ---------- */
const StoryProgress = () => {
    const {
        chapters, endings, source, license,
        endingsIntro, endingsFlowchart, endingsFlowchartCredit, endingsWikiLink,
    } = storyData;

    const [progress, setProgress] = useState(loadProgress);
    const [isRefresh, setIsRefresh] = useState(false);
    // จำบทที่อ่านค้างไว้ กลับมาแล้วไม่ต้องหาใหม่
    const [selectedId, setSelectedId] = useState(() => {
        try {
            const saved = localStorage.getItem(CHAPTER_KEY);
            return chapters.some((c) => c.id === saved) ? saved : chapters[0]?.id;
        } catch {
            return chapters[0]?.id;
        }
    });
    const [expandedSteps, setExpandedSteps] = useState(() => new Set());
    const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
    const [expandedGroups, setExpandedGroups] = useState(() => new Set());
    const [hideDone, setHideDone] = useState(false);
    const [view, setView] = useState(() => {
        try { return localStorage.getItem(VIEW_KEY) === 'endings' ? 'endings' : 'chapters'; }
        catch { return 'chapters'; }
    });

    // sync กับหน้าอื่น (ปุ่ม RESET บน navbar ยิง event 'storage')
    useEffect(() => {
        const handleStorageChange = () => setProgress(loadProgress());
        setIsRefresh(true);
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    useEffect(() => {
        if (isRefresh) localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }, [progress, isRefresh]);

    useEffect(() => {
        if (isRefresh) localStorage.setItem(VIEW_KEY, view);
    }, [view, isRefresh]);

    useEffect(() => {
        if (isRefresh && selectedId) localStorage.setItem(CHAPTER_KEY, selectedId);
    }, [selectedId, isRefresh]);

    const isStepDone = useCallback(
        (chapterId, step) => !!(progress[chapterId] || {})[stepKey(step)],
        [progress],
    );

    // นับจากรายการขั้นจริงของบท -> key ที่ค้างจากข้อมูลเวอร์ชันเก่าไม่ถูกนับ
    // แยก required กับ optional: ขั้นไม่บังคับไม่ควรถ่วง % ให้ดูเหมือนบทยังไม่จบ
    const countOf = useCallback((chapter) => {
        const { required, optional } = chapterFacts(chapter);
        return {
            required: required.length,
            optional: optional.length,
            doneRequired: required.filter((step) => isStepDone(chapter.id, step)).length,
            doneOptional: optional.filter((step) => isStepDone(chapter.id, step)).length,
        };
    }, [isStepDone]);

    const toggleStep = (chapterId, step) => {
        const key = stepKey(step);
        setProgress((prev) => {
            const chapter = { ...(prev[chapterId] || {}) };
            if (chapter[key]) delete chapter[key];
            else chapter[key] = true;
            return { ...prev, [chapterId]: chapter };
        });
    };

    const markChapter = (chapter, complete) => {
        setProgress((prev) => {
            if (!complete) return { ...prev, [chapter.id]: {} };
            const all = {};
            chapter.objectives.forEach((step) => { all[stepKey(step)] = true; });
            return { ...prev, [chapter.id]: all };
        });
    };

    const overall = useMemo(() => {
        let steps = 0;
        let stepsDone = 0;
        let chaptersDone = 0;
        chapters.forEach((c) => {
            const n = countOf(c);
            steps += n.required;
            stepsDone += n.doneRequired;
            if (n.required > 0 && n.doneRequired >= n.required) chaptersDone += 1;
        });
        return { steps, stepsDone, chaptersDone, percent: steps ? Math.round((stepsDone / steps) * 100) : 0 };
    }, [chapters, countOf]);

    const index = chapters.findIndex((c) => c.id === selectedId);
    const selected = chapters[index] || chapters[0];
    const facts = chapterFacts(selected);
    const counts = countOf(selected);
    const selectedDone = counts.doneRequired;
    const selectedTotal = counts.required;
    const chapterComplete = selectedTotal > 0 && selectedDone >= selectedTotal;
    // ขั้นแรกที่ยังไม่ติ๊ก = ขั้นที่กำลังทำอยู่
    const currentIndex = Math.max(0, selected.objectives.findIndex(
        (step) => !step.optional && !isStepDone(selected.id, step),
    ));

    const go = (delta) => {
        const next = chapters[(index + delta + chapters.length) % chapters.length];
        setSelectedId(next.id);
        if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // จัดขั้นตอนเป็นกลุ่มตามทางแยกของเนื้อเรื่อง
    const groups = useMemo(() => {
        const out = [];
        selected.objectives.forEach((step, i) => {
            const key = step.branch || null;
            const last = out[out.length - 1];
            if (last && last.branch === key) last.items.push({ step, index: i });
            else out.push({ branch: key, endings: step.branchEndings || [], items: [{ step, index: i }] });
        });
        return out;
    }, [selected]);

    return (
        <div style={styles.appContainerStyle}>
            {/* ---------- header ---------- */}
            <header style={styles.stickyHeaderStyle}>
                <div style={{ ...WRAP, padding: '0.9rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <div style={{ backgroundColor: ACCENT, padding: '0.45rem', borderRadius: '0.5rem', display: 'flex' }}>
                                <Icons.Book size={22} style={{ color: '#0b1120' }} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.15, margin: 0 }}>Story</h1>
                                <p style={{ fontSize: '0.7rem', color: COLORS.textSecondary, fontFamily: 'monospace', letterSpacing: '0.06em', margin: 0 }}>
                                    {chapters.length} CHAPTERS · {endings.length} ENDINGS
                                </p>
                            </div>
                        </div>

                        <div style={{ flexGrow: 1, minWidth: '220px', maxWidth: '460px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: COLORS.textSecondary, marginBottom: '0.25rem' }}>
                                <span>{overall.chaptersDone} of {chapters.length} chapters complete</span>
                                <span>{overall.stepsDone}/{overall.steps} required steps · {overall.percent}%</span>
                            </div>
                            <Bar value={overall.stepsDone} total={overall.steps} color={overall.chaptersDone === chapters.length ? COLORS.success : ACCENT} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* แยก Chapters / Endings เป็นแท็บ ไม่ต้องเลื่อนผ่านบททั้งหมดไปหาตอนจบ */}
                            <div style={{ display: 'flex', padding: '0.15rem', borderRadius: '999px', backgroundColor: COLORS.bgHeader, border: `1px solid ${COLORS.border}` }}>
                                {[
                                    { key: 'chapters', label: 'Chapters', icon: Icons.Book },
                                    { key: 'endings', label: 'Endings', icon: Icons.Trophy },
                                ].map((tab) => {
                                    const on = view === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setView(tab.key)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer',
                                                padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600,
                                                border: 'none', transition: 'all 0.15s ease',
                                                backgroundColor: on ? ACCENT : 'transparent',
                                                color: on ? '#0b1120' : COLORS.textSecondary,
                                            }}
                                        >
                                            <tab.icon size={14} /> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </div>
            </header>

            <main style={view === 'endings'
                ? { ...WRAP, paddingTop: '1.25rem' }
                : { ...WRAP, paddingTop: '1.25rem', display: 'flex', gap: '1.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {view === 'endings' ? (
                    <EndingsPanel
                        endings={endings}
                        intro={endingsIntro}
                        flowchart={endingsFlowchart}
                        flowchartCredit={endingsFlowchartCredit}
                        wikiLink={endingsWikiLink}
                    />
                ) : (<>
                {/* ---------- สารบัญ ---------- */}
                <aside style={{ flex: '0 1 272px', minWidth: '240px', position: 'sticky', top: '5.5rem' }}>
                    <div style={{ ...styles.cardStyle, marginBottom: 0, padding: '0.6rem' }}>
                        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.textSecondary, padding: '0.2rem 0.4rem 0.5rem' }}>
                            Chapters
                        </div>
                        {chapters.map((chapter, i) => (
                            <ChapterRow
                                key={chapter.id}
                                chapter={chapter}
                                index={i}
                                done={countOf(chapter).doneRequired}
                                total={countOf(chapter).required}
                                forks={chapterFacts(chapter).forks.length}
                                isActive={chapter.id === selected.id}
                                onSelect={() => setSelectedId(chapter.id)}
                            />
                        ))}
                    </div>
                </aside>

                {/* ---------- บทที่เลือก ---------- */}
                <section style={{ flex: '1 1 640px', minWidth: 0 }}>
                    {/* hero */}
                    <div style={{
                        borderRadius: '0.6rem', overflow: 'hidden', marginBottom: '1rem',
                        border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgCard,
                    }}>
                        <div style={{ position: 'relative' }}>
                            <ChapterImage
                                file={selected.bannerFile} alt={selected.name} lazy={false}
                                style={{ width: '100%', height: 'clamp(180px, 22vw, 280px)', objectFit: 'cover', display: 'block', opacity: 0.75 }}
                            />
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(to top, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.35) 55%, rgba(15,23,42,0.1) 100%)',
                            }} />
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.9rem 1rem', display: 'flex', alignItems: 'flex-end', gap: '0.7rem' }}>
                                <ChapterImage file={selected.iconFile} alt="" lazy={false} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
                                <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: ACCENT }}>
                                        Chapter {index + 1} of {chapters.length}
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{selected.name}</h2>
                                </div>
                                {chapterComplete && <Chip color={COLORS.success} bg="rgba(34,197,94,0.15)"><Icons.Check size={12} /> Complete</Chip>}
                            </div>
                        </div>

                        <div style={{ padding: '0.9rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                {selected.previous && <Chip>Follows {selected.previous}</Chip>}
                                {selected.leadsTo && <Chip color={ACCENT} bg={ACCENT_DIM}>Leads to {selected.leadsTo}</Chip>}
                                <a href={selected.wikiLink} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: '0.75rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Icons.ExternalLink size={12} /> Read on wiki
                                </a>
                            </div>

                            <p style={{
                                margin: 0, padding: '0 0 0 0.8rem', borderLeft: `3px solid ${ACCENT}`,
                                fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '90ch',
                                color: COLORS.textPrimary, fontStyle: 'italic',
                            }}>
                                {selected.description}
                            </p>

                            {/* บทที่มีทางแยก บอกไว้ตรงนี้เลย ไม่ต้องเลื่อนไปเจอเอง */}
                            {facts.forks.length > 0 && (
                                <div style={{
                                    marginTop: '0.85rem', padding: '0.6rem 0.8rem', borderRadius: '0.45rem',
                                    backgroundColor: facts.forkEndings.length ? 'rgba(234,179,8,0.10)' : ACCENT_DIM,
                                    border: `1px solid ${facts.forkEndings.length ? COLORS.accent : ACCENT}`,
                                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap',
                                }}>
                                    <Icons.Component size={16} style={{ color: facts.forkEndings.length ? COLORS.accent : ACCENT, flexShrink: 0, marginTop: '0.1rem' }} />
                                    <div style={{ flexGrow: 1, minWidth: '200px' }}>
                                        <div style={{ fontSize: '0.85rem', color: COLORS.textPrimary, fontWeight: 600 }}>
                                            {facts.forks.length} branching choice{facts.forks.length > 1 ? 's' : ''} in this chapter
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: COLORS.textSecondary }}>
                                            {facts.forkEndings.length > 0
                                                ? 'What you pick here decides which ending you get — and it cannot be undone.'
                                                : 'The route splits here, but the wiki does not tie these forks to a specific ending.'}
                                        </div>
                                        {facts.forkEndings.length > 0 && (
                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                                {facts.forkEndings.map((e) => (
                                                    <Chip key={e} color={COLORS.accent} bg="rgba(234,179,8,0.14)">{e}</Chip>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selected.requirements.length > 0 && (
                                <div style={{ marginTop: '0.85rem' }}>
                                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.accent, marginBottom: '0.25rem' }}>
                                        How it starts
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.55, color: COLORS.textSecondary }}>
                                        {selected.requirements.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: COLORS.textSecondary, marginBottom: '0.3rem' }}>
                                    <span>
                                        Chapter progress
                                        {counts.optional > 0 && (
                                            <span style={{ color: '#93c5fd' }}>
                                                {' '}· {counts.doneOptional}/{counts.optional} optional done
                                            </span>
                                        )}
                                    </span>
                                    <span>
                                        {selectedDone} / {selectedTotal} required
                                        {counts.optional > 0 ? ` (+${counts.optional} optional)` : ''}
                                    </span>
                                </div>
                                <Bar value={selectedDone} total={selectedTotal} color={chapterComplete ? COLORS.success : ACCENT} height={8} />
                            </div>

                            <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                                <button onClick={() => go(-1)} style={{ ...styles.buttonStyle, fontSize: '0.78rem', backgroundColor: COLORS.bgHeader }}>
                                    <Icons.ChevronLeft size={14} /> <span>Previous</span>
                                </button>
                                <button onClick={() => go(1)} style={{ ...styles.buttonStyle, fontSize: '0.78rem', backgroundColor: COLORS.bgHeader }}>
                                    <span>Next</span> <Icons.ChevronRight size={14} />
                                </button>
                                <span style={{ flexGrow: 1 }} />
                                <button
                                    onClick={() => markChapter(selected, !chapterComplete)}
                                    style={{
                                        ...styles.buttonStyle, fontSize: '0.78rem',
                                        backgroundColor: chapterComplete ? COLORS.bgHeader : 'rgba(34,197,94,0.15)',
                                        border: `1px solid ${chapterComplete ? COLORS.border : COLORS.success}`,
                                        color: chapterComplete ? COLORS.textSecondary : COLORS.success,
                                    }}
                                >
                                    {chapterComplete ? <Icons.RotateCcw size={14} /> : <Icons.Check size={14} />}
                                    <span>{chapterComplete ? 'Reset chapter' : 'Mark all done'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ขั้นตอน */}
                    <>
                            {/* ขั้นที่ต้องทำตอนนี้ — ไม่ต้องเลื่อนหาว่าค้างไว้ตรงไหน */}
                            <FocusCard
                                step={selected.objectives[currentIndex]}
                                index={currentIndex}
                                total={selectedTotal}
                                chapterComplete={chapterComplete}
                                onDone={() => toggleStep(selected.id, selected.objectives[currentIndex])}
                            />

                            {/* แถบควบคุมรายการ: ย่อของที่ทำแล้ว / กาง-ยุบรายละเอียดทั้งหมด */}
                            <div style={{
                                display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center',
                                marginBottom: '0.6rem',
                            }}>
                                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: COLORS.textSecondary, flexGrow: 1 }}>
                                    All steps ({selected.objectives.length})
                                </span>
                                <button
                                    onClick={() => setHideDone(!hideDone)}
                                    style={{
                                        ...styles.buttonStyle, fontSize: '0.76rem', padding: '0.25rem 0.6rem',
                                        backgroundColor: hideDone ? ACCENT_DIM : COLORS.bgCard,
                                        border: `1px solid ${hideDone ? ACCENT : COLORS.border}`,
                                    }}
                                >
                                    <Icons.Filter size={13} />
                                    <span>{hideDone ? `Completed hidden (${selectedDone})` : 'Hide completed'}</span>
                                </button>
                                <button
                                    onClick={() => setExpandedSteps((prev) => {
                                        const all = selected.objectives.map((_, i) => `${selected.id}:${i}`);
                                        const anyOpen = all.some((k) => prev.has(k));
                                        return anyOpen ? new Set() : new Set(all);
                                    })}
                                    style={{ ...styles.buttonStyle, fontSize: '0.76rem', padding: '0.25rem 0.6rem', backgroundColor: COLORS.bgCard }}
                                >
                                    <Icons.Book size={13} /> <span>Toggle all details</span>
                                </button>
                            </div>

                            {groups.map((group, gi) => {
                                const groupKey = `${selected.id}:g${gi}`;
                                const rows = group.items.filter(({ step }) => !(hideDone && isStepDone(selected.id, step)));
                                const groupDone = group.items.every(({ step }) => isStepDone(selected.id, step));
                                const collapsed = collapsedGroups.has(groupKey) || (groupDone && !expandedGroups.has(groupKey));
                                if (rows.length === 0 && !group.branch) return null;

                                return (
                                    <div key={gi} style={{ ...styles.cardStyle, marginBottom: '0.9rem' }}>
                                        {(group.branch || groupDone) && (
                                            <div
                                                onClick={() => {
                                                    const key = groupKey;
                                                    if (collapsed) {
                                                        setCollapsedGroups((prev) => { const n = new Set(prev); n.delete(key); return n; });
                                                        setExpandedGroups((prev) => new Set(prev).add(key));
                                                    } else {
                                                        setExpandedGroups((prev) => { const n = new Set(prev); n.delete(key); return n; });
                                                        setCollapsedGroups((prev) => new Set(prev).add(key));
                                                    }
                                                }}
                                                style={{
                                                    padding: '0.55rem 0.9rem', cursor: 'pointer',
                                                    backgroundColor: groupDone ? 'rgba(34,197,94,0.08)' : ACCENT_DIM,
                                                    borderBottom: collapsed ? 'none' : `1px solid ${COLORS.border}`,
                                                    fontSize: '0.82rem', color: groupDone ? COLORS.success : '#c4b5fd',
                                                    display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap',
                                                }}
                                            >
                                                {collapsed ? <Icons.ChevronDown size={14} /> : <Icons.ChevronUp size={14} />}
                                                <span style={{ flexGrow: 1, minWidth: 0 }}>
                                                    {group.branch || 'Completed steps'}
                                                </span>
                                                <Chip color={groupDone ? COLORS.success : COLORS.textSecondary}>
                                                    {group.items.filter(({ step }) => isStepDone(selected.id, step)).length}/{group.items.length}
                                                </Chip>
                                                {group.endings.map((n) => <Chip key={n} color={COLORS.accent} bg="rgba(234,179,8,0.12)">{n}</Chip>)}
                                            </div>
                                        )}

                                        {!collapsed && rows.map(({ step, index: si }) => (
                                            <StepRow
                                                key={si}
                                                step={step}
                                                index={si}
                                                isDone={isStepDone(selected.id, step)}
                                                isCurrent={si === currentIndex}
                                                expanded={expandedSteps.has(`${selected.id}:${si}`)}
                                                onToggleDone={() => toggleStep(selected.id, step)}
                                                onToggleExpand={() => setExpandedSteps((prev) => {
                                                    const key = `${selected.id}:${si}`;
                                                    const next = new Set(prev);
                                                    if (next.has(key)) next.delete(key); else next.add(key);
                                                    return next;
                                                })}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                    </>

                </section>
                </>)}
            </main>

            <footer style={{
                borderTop: `1px solid ${COLORS.border}`, marginTop: '3rem', padding: '1.75rem 1rem',
                textAlign: 'center', color: COLORS.textSecondary, fontSize: '0.8rem',
            }}>
                <p style={{ margin: 0 }}>
                    {license} —{' '}
                    <a href={source} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>
                        Story chapters on the EFT Wiki
                    </a>
                </p>
            </footer>
        </div>
    );
};

export default StoryProgress;
