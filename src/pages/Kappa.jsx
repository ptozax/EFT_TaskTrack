import React, { useState, useEffect, useMemo } from 'react';
import questsStatic from "../data/tasks";
import { useLiveData } from '../data/gameStore';
import { Icons, TRADER_THEMES } from '../Component/EftComponent';
import { P, card, chip, badge, label, Bar, Ring, SearchBox, Empty } from '../Component/PanelUI.jsx';
import * as QuestComponent from '../Component/QuestComponent';

const STORE_KEY = 'eft_completed_quests';
const VIEW_KEY = 'eft_kappa_view';

/* ------------------------------------------------------------------ *
 * สถานะของเควสหนึ่งตัว เทียบกับสิ่งที่ทำไปแล้ว
 *   done    = ทำเสร็จ
 *   failed  = ทำพลาด (เลือกสายอื่นไปแล้ว)
 *   ready   = ไม่มีเควสอื่นขวางอยู่
 *   blocked = ยังติดเควสก่อนหน้า
 *
 * หมายเหตุ: ในเกมยังต้องดูเลเวลผู้เล่นกับ Loyalty Level ของเทรดเดอร์ด้วย
 * แต่แอปไม่ได้เก็บเลเวลผู้เล่นไว้ -> คิดได้แค่เงื่อนไข "เควสก่อนหน้า" เท่านั้น
 * จึงใช้คำว่า ready/blocked ไม่ใช่ available/locked เพื่อไม่ให้เข้าใจผิด
 * ------------------------------------------------------------------ */
const buildStatusFn = (tasks, completedIds) => {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const done = new Set(completedIds.filter((c) => c.status === 'complete').map((c) => c.id));
  const failed = new Set(completedIds.filter((c) => c.status === 'failed').map((c) => c.id));

  const reqMet = (req) => {
    const id = req.task?.id;
    const status = req.status?.length ? req.status : ['complete'];
    if (status.includes('complete') && done.has(id)) return true;
    if (status.includes('failed') && failed.has(id)) return true;
    // 'active' = ปลดล็อกตั้งแต่เควสก่อนหน้า "เริ่มได้" ไม่ต้องรอให้จบ
    if (status.includes('active')) {
      if (done.has(id)) return true;
      const pre = byId.get(id)?.taskRequirements || [];
      return pre.length > 0 && pre.every((r) => done.has(r.task?.id));
    }
    return false;
  };

  return (quest) => {
    if (done.has(quest.id)) return 'done';
    if (failed.has(quest.id)) return 'failed';
    const reqs = quest.taskRequirements || [];
    return reqs.every(reqMet) ? 'ready' : 'blocked';
  };
};

const STATUS_META = {
  done: { color: P.green, text: 'Done' },
  failed: { color: P.red, text: 'Failed' },
  ready: { color: P.gold, text: 'Ready' },
  blocked: { color: P.dim, text: 'Blocked' },
};

const FILTERS = [
  { key: 'all', text: 'All' },
  { key: 'ready', text: 'Ready' },
  { key: 'blocked', text: 'Blocked' },
  { key: 'done', text: 'Done' },
];

/* ---------------------------- แถวเควส ---------------------------- */
const QuestRow = ({ quest, status, blockers, expanded, onExpand, onToggle }) => {
  const meta = STATUS_META[status];
  const trader = TRADER_THEMES[quest.trader.name] || { bg: '#334155' };
  const settled = status === 'done' || status === 'failed';

  return (
    <div style={{
      ...card,
      borderColor: status === 'available' ? `${P.gold}55` : P.border,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
        {/* ปุ่มติ๊กสถานะ */}
        <button
          onClick={() => onToggle(quest.id)}
          title={settled ? 'Mark as not done' : 'Mark as done'}
          style={{
            flexShrink: 0, width: 26, height: 26, marginTop: 1, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            border: `1px solid ${settled ? meta.color : '#2a3550'}`,
            background: settled ? meta.color : P.inputBg,
            color: settled ? '#06121f' : 'transparent',
            transition: 'all .15s ease',
          }}
        >
          {status === 'failed' ? <Icons.Cross size={15} /> : <Icons.Check size={15} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => onExpand(expanded ? null : quest.id)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {/* แถบสีเทรดเดอร์ — บอกว่าใครสั่งงานได้โดยไม่ต้องอ่าน */}
            <span style={{
              width: 4, height: 20, borderRadius: 2, background: trader.bg, flexShrink: 0,
            }} />
            <span style={{
              flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 700,
              color: status === 'done' ? P.dim : P.text,
              textDecoration: status === 'done' ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {quest.name}
            </span>
            <span style={{ color: P.dim, display: 'flex', flexShrink: 0 }}>
              {expanded ? <Icons.ChevronUp size={15} /> : <Icons.ChevronDown size={15} />}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={badge(meta.color)}>{meta.text}</span>
            <span style={{ ...label, fontWeight: 600 }}>{quest.trader.name}</span>
            {quest.minPlayerLevel > 1 && <span style={{ ...label, fontWeight: 600 }}>· LV {quest.minPlayerLevel}</span>}
            {quest.experience > 0 && <span style={{ ...label, fontWeight: 600 }}>· {quest.experience.toLocaleString()} XP</span>}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{
          borderTop: `1px solid ${P.borderSoft}`,
          background: P.panelBg, padding: '12px 14px',
        }}>
          {/* ติดอยู่เพราะอะไร — ตอบคำถามแรกที่ผู้เล่นถามเสมอ */}
          {status === 'blocked' && blockers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...label, marginBottom: 6 }}>Requires first</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {blockers.map((b) => (
                  <span key={b.id} style={badge(P.dim)}>{b.name}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...label, marginBottom: 6 }}>Objectives ({quest.objectives.length})</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
            {quest.objectives.map((obj, i) => (
              <li key={i} style={{
                fontSize: '12.5px', color: P.muted, lineHeight: 1.5,
                paddingLeft: 14, position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', left: 2, top: 7, width: 4, height: 4,
                  borderRadius: 999, background: '#3a4a6b',
                }} />
                {obj.description}
                {obj.count > 1 && <span style={{ color: P.blue, fontWeight: 700 }}> ×{obj.count}</span>}
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <a
              href={quest.wikiLink} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '12px', fontWeight: 700, color: P.blue, textDecoration: 'none',
              }}
            >
              Wiki <Icons.ExternalLink size={13} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------------------- หน้าหลัก ---------------------------- */
const Kappa = () => {
  const quests = useLiveData(questsStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static

  const [completedIds, setCompletedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
  });
  const [isRefresh, setIsRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState(() => {
    try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || { filter: 'all', trader: 'All' }; }
    catch { return { filter: 'all', trader: 'All' }; }
  });
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(STORE_KEY);
        setCompletedIds(saved ? JSON.parse(saved) : []);
      } catch (err) { console.error(err); }
    };
    setIsRefresh(true);
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (isRefresh) localStorage.setItem(STORE_KEY, JSON.stringify(completedIds));
  }, [completedIds, isRefresh]);

  useEffect(() => { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); }, [view]);

  const toggleQuest = (id) => {
    const already = completedIds.find((q) => q.id === id);
    if (already) {
      // ปลดเควส: เอาเควสนี้ + เควสที่ใช้เควสนี้เป็น prerequisite (cascade ออกทั้งสาย)
      setCompletedIds((prev) => {
        const remove = new Set([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const q of quests) {
            if (remove.has(q.id)) continue;
            if (!prev.some((c) => c.id === q.id)) continue;      // แตะเฉพาะที่มีสถานะอยู่
            if ((q.taskRequirements || []).some((r) => remove.has(r.task.id))) {
              remove.add(q.id); changed = true;
            }
          }
        }
        return prev.filter((q) => !remove.has(q.id));
      });
    } else {
      // ทำเควสเสร็จ: เพิ่มเควสนี้ + prerequisites (dedup ตาม id)
      const additions = QuestComponent.getPreviousQuestsList(id, completedIds);
      if (additions.length) {
        setCompletedIds((prev) => {
          const byId = new Map(prev.map((q) => [q.id, q]));
          additions.forEach((q) => byId.set(q.id, q));
          return Array.from(byId.values());
        });
      }
    }
  };

  /* เควส Kappa ทั้งหมดของฝ่ายที่เลือก (Textile / Drip-Out ฯลฯ มีเวอร์ชัน BEAR กับ USEC แยกกัน
     ถ้าไม่กรองจะขึ้นซ้ำสองและทำให้ตัวหารเกินจริง) */
  const kappaQuests = useMemo(() => {
    const faction = (() => {
      try { return JSON.parse(localStorage.getItem('eft_faction_name')) || 'BEAR'; } catch { return 'BEAR'; }
    })();
    return quests
      .filter((q) => q.kappaRequired && ['Any', faction].includes(q.factionName))
      .sort((a, b) => (a.minPlayerLevel - b.minPlayerLevel) || a.name.localeCompare(b.name));
  }, [quests]);

  const statusOf = useMemo(() => buildStatusFn(quests, completedIds), [quests, completedIds]);

  // สถานะ + เควสที่ขวางอยู่ ของทุกเควส Kappa (คำนวณรอบเดียว ใช้ทั้งตัวนับและรายการ)
  const rows = useMemo(() => {
    const byId = new Map(quests.map((t) => [t.id, t]));
    const doneIds = new Set(completedIds.filter((c) => c.status === 'complete').map((c) => c.id));
    return kappaQuests.map((q) => ({
      quest: q,
      status: statusOf(q),
      blockers: (q.taskRequirements || [])
        .filter((r) => !doneIds.has(r.task?.id))
        .map((r) => ({ id: r.task?.id, name: byId.get(r.task?.id)?.name || r.task?.name || '?' })),
    }));
  }, [kappaQuests, statusOf, quests, completedIds]);

  const counts = useMemo(() => {
    const c = { all: rows.length, done: 0, failed: 0, ready: 0, blocked: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  // ความคืบหน้าต่อเทรดเดอร์ — คิดจากเควสทั้งหมดของเทรดเดอร์นั้นเสมอ ไม่ใช่รายการที่ถูกกรอง
  const traderStats = useMemo(() => {
    const g = new Map();
    rows.forEach(({ quest, status }) => {
      const name = quest.trader.name;
      if (!g.has(name)) g.set(name, { name, total: 0, done: 0 });
      const s = g.get(name);
      s.total += 1;
      if (status === 'done') s.done += 1;
    });
    return [...g.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const visible = useMemo(() => rows.filter(({ quest, status }) => {
    if (view.trader !== 'All' && quest.trader.name !== view.trader) return false;
    if (view.filter === 'done' && status !== 'done' && status !== 'failed') return false;
    if (view.filter === 'ready' && status !== 'ready') return false;
    if (view.filter === 'blocked' && status !== 'blocked') return false;
    if (searchTerm && !quest.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }), [rows, view, searchTerm]);

  const set = (patch) => setView((v) => ({ ...v, ...patch }));

  return (
    <div style={{ background: P.bg, minHeight: '100vh', color: P.text }}>
      {/* ---------------- header ---------------- */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(11,18,34,.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${P.border}`,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Ring value={counts.done} total={counts.all} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ fontSize: '19px', fontWeight: 900, margin: 0, letterSpacing: '-.01em' }}>
                Kappa Tracker
              </h1>
              <div style={{ ...label, marginTop: 3 }}>
                {counts.done} of {counts.all} quests complete
              </div>
              <div style={{ marginTop: 9, maxWidth: 460 }}>
                <Bar value={counts.done} total={counts.all} />
              </div>
            </div>

            {/* ตัวเลขสรุป — เห็นได้โดยไม่ต้องกดอะไร */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { k: 'ready', n: counts.ready, t: 'Ready' },
                { k: 'blocked', n: counts.blocked, t: 'Blocked' },
                { k: 'done', n: counts.done, t: 'Done' },
              ].map(({ k, n, t }) => (
                <button
                  key={k}
                  onClick={() => set({ filter: view.filter === k ? 'all' : k })}
                  style={{
                    ...card, padding: '9px 14px', minWidth: 78, cursor: 'pointer',
                    textAlign: 'center',
                    borderColor: view.filter === k ? STATUS_META[k].color : P.border,
                  }}
                >
                  <div style={{ fontSize: '19px', fontWeight: 900, color: STATUS_META[k].color, lineHeight: 1 }}>{n}</div>
                  <div style={{ ...label, marginTop: 4 }}>{t}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ---------------- ตัวกรอง ---------------- */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search quest name..." width={280} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <span key={f.key} style={chip(view.filter === f.key)} onClick={() => set({ filter: f.key })}>
                  {f.text}
                  <span style={{ opacity: .65 }}>
                    {f.key === 'done' ? counts.done + counts.failed : counts[f.key]}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* แถวเทรดเดอร์ — แทนที่ accordion 8 อันของเดิม กดกรองได้ทันที เห็นความคืบหน้าพร้อมกัน */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={chip(view.trader === 'All')} onClick={() => set({ trader: 'All' })}>
              All traders
            </span>
            {traderStats.map((t) => {
              const color = TRADER_THEMES[t.name]?.bg || P.label;
              const active = view.trader === t.name;
              return (
                <span
                  key={t.name}
                  style={{ ...chip(active, color), paddingRight: 8 }}
                  onClick={() => set({ trader: active ? 'All' : t.name })}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
                  {t.name}
                  <span style={{ opacity: .7, fontVariantNumeric: 'tabular-nums' }}>{t.done}/{t.total}</span>
                </span>
              );
            })}
          </div>
        </div>
      </header>

      {/* ---------------- รายการเควส ---------------- */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '18px 20px 64px' }}>
        {visible.length === 0 ? (
          <Empty
            icon={<Icons.Trophy size={44} />}
            title="No quests match these filters"
            hint="Try clearing the search or picking a different trader."
          />
        ) : (
          <>
            <div style={{
              ...label, marginBottom: 10, display: 'flex', gap: 8,
              alignItems: 'center', flexWrap: 'wrap',
            }}>
              <span>Showing {visible.length} of {counts.all}</span>
              <span style={{ opacity: .5 }}>·</span>
              <span style={{ textTransform: 'none', letterSpacing: 0, color: P.dim }}>
                “Ready” means no other quest is blocking it — trader loyalty level and player level still apply.
              </span>
            </div>
            <div style={{
              display: 'grid', gap: 10,
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              alignItems: 'start',
            }}>
              {visible.map(({ quest, status, blockers }) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  status={status}
                  blockers={blockers}
                  expanded={expandedId === quest.id}
                  onExpand={setExpandedId}
                  onToggle={toggleQuest}
                />
              ))}
            </div>
          </>
        )}

        <footer style={{
          marginTop: 40, paddingTop: 18, borderTop: `1px solid ${P.borderSoft}`,
          textAlign: 'center', ...label,
        }}>
          Quest data from tarkov.dev · Kappa list from the EFT Wiki (CC BY-SA 3.0) · Not affiliated with Battlestate Games
        </footer>
      </main>
    </div>
  );
};

export default Kappa;
