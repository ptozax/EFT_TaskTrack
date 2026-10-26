import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "../Component/home.css";
import questsStatic from "../data/tasks";
import { useLiveData } from '../data/gameStore';
import * as QuestComponent from '../Component/QuestComponent';
import { Icons, TRADER_THEMES } from '../Component/EftComponent';
import { P, card, chip, badge, label, Bar, SearchBox, Empty, KeyChip, useNavbarOffset } from '../Component/PanelUI.jsx';
import { usePersisted } from '../Component/usePersisted.js';

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const COMPLETE_KEY = "eft_completed_quests";
const HIDDEN_KEY = "eft_hidden_objectives";   // เดิมเก็บแต่ใน state -> รีเฟรชทีเดียวหาย
const DRAWER_KEY = "eft_home_drawer";         // แผงข้างเปิดค้างไว้ไหม

/* ลำดับเทรดเดอร์ตามหน้า Traders ในเกม ไม่ใช่เรียงตามตัวอักษร
   Lightkeeper กับ Btr Driver ไม่ได้อยู่ในหน้านั้น เลยต่อท้าย Ref ไป */
const TRADER_ORDER = [
  'Prapor', 'Therapist', 'Fence', 'Skier', 'Peacekeeper',
  'Mechanic', 'Ragman', 'Jaeger', 'Ref', 'Lightkeeper', 'Btr Driver',
];
const byTraderOrder = (a, b) => {
  const ia = TRADER_ORDER.indexOf(a);
  const ib = TRADER_ORDER.indexOf(b);
  // ชื่อที่ไม่รู้จัก (เทรดเดอร์ใหม่หลังอัปเดตเกม) ไปต่อท้ายแล้วเรียงตามตัวอักษรกันเอง
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
};

/* Ground Zero 21+ กับ Ground Zero Tutorial เป็นแมพเดียวกับ Ground Zero
   ต่างกันแค่เลเวลผู้เล่นที่เข้าได้ -> ยุบเป็นตัวเลือกเดียว ไม่งั้นต้องกดสามอัน
   (Night Factory / The Lab (Dark) ไม่ยุบ — คนละรอบเวลา ของที่เจอต่างกันจริง) */
const MAP_ALIAS = {
  'Ground Zero 21+': 'Ground Zero',
  'Ground Zero Tutorial': 'Ground Zero',
};
const mapName = (n) => MAP_ALIAS[n] || n;

const getObjectiveKey = (questId, objectiveId) => `${questId}|${objectiveId}`;
// จำนวนเควสที่เสนอครั้งแรกในการ์ด (กางดูทั้งหมดได้) — เดิม 8 ซึ่งเยอะไปต่อเทรดเดอร์
const SUGGEST_PREVIEW = 5;
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

/* สีพื้นตามระดับไอเทมของเกม (มากับข้อมูลในฟิลด์ item.backgroundColor) */
const ITEM_BG = {
  black: '#272727', blue: '#26343a', default: '#333333', green: '#1c2618',
  grey: '#2a2a2a', orange: '#49290f', red: '#4a1b1b', violet: '#372348', yellow: '#45402a',
};
const itemBg = (item) => ITEM_BG[item?.backgroundColor] || ITEM_BG.default;

/**
 * ความคืบหน้าของเควส
 * - นับเฉพาะ objective ที่ "บังคับ" (optional ไม่นับในตัวหาร ไม่งั้นทำครบแล้วยังไม่ถึง 100%)
 * - objective ที่ซ่อนไว้ยังนับอยู่ — การซ่อนเป็นแค่การจัดหน้าจอ ถ้าหักออกจากตัวหารด้วย
 *   จะกดซ่อนให้เหลือรายการเดียวแล้วได้ 100% ทั้งที่ยังไม่ได้ทำอะไร
 */
const progressOfQuest = (quest, checked) => {
  const objs = quest.objectives || [];
  const required = objs.filter((o) => !o.optional);
  const optional = objs.filter((o) => o.optional);
  const hit = (o) => !!checked[getObjectiveKey(quest.id, o.id)];
  return {
    done: required.filter(hit).length,
    total: required.length,
    optDone: optional.filter(hit).length,
    optTotal: optional.length,
  };
};

/* ปุ่มไอคอนเล็กท้ายรายการ (ทำเสร็จ / เอาออก / ซ่อน) */
const MiniButton = ({ title, color, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 26, height: 26, flexShrink: 0, borderRadius: 7, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${color}55`, background: `${color}18`, color,
      transition: 'all .15s ease',
    }}
  >
    {children}
  </button>
);

/* แถวตัวกรองในแถบหนึบ — ป้ายชื่อซ้าย ชิปเรียงขวาแบบเลื่อนแนวนอน
   ไม่ตัดบรรทัด (nowrap) เพื่อให้แถบหนึบสูงคงที่ ไม่ว่าจะมีกี่ตัวเลือก */
const FilterRow = ({ title, empty, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ ...label, width: 58, flexShrink: 0 }}>{title}</span>
    <div
      className="eft-filter-row"
      style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 1, minWidth: 0, padding: '1px 0' }}
    >
      {React.Children.count(children) === 0
        ? <span style={{ ...label, textTransform: 'none', letterSpacing: 0 }}>— {empty} —</span>
        : children}
    </div>
  </div>
);

/* หัวข้อคั่นกลุ่มในผลการค้นหา */
const SearchGroup = ({ title, hint, color }) => (
  <div style={{ ...label, display: 'flex', alignItems: 'center', gap: 7, padding: '9px 6px 5px', color }}>
    {title}
    {hint && <span style={{ ...label, textTransform: 'none', letterSpacing: 0 }}>— {hint}</span>}
  </div>
);

/* หนึ่งบรรทัดในผลการค้นหา — ป้ายท้ายบรรทัดส่งเข้ามาเป็น children เพราะแต่ละกลุ่มต่างกัน */
const SearchRow = ({ quest, onClick, children }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
      borderRadius: 8, cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <span style={{
      width: 4, height: 18, borderRadius: 2, flexShrink: 0,
      background: TRADER_THEMES[quest.trader?.name]?.bg || '#334155',
    }} />
    <span style={{
      flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 600,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {quest.name}
    </span>
    <span style={label}>{quest.trader?.name}</span>
    {children}
  </div>
);

const Home = () => {
  const quests = useLiveData(questsStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static

  /* ---------------- SAVE STATE ---------------- */
  const [selectedQuests, setSelectedQuests] = useState(() => readJSON(STORAGE_KEY, []));
  const [checkedObjectives, setCheckedObjectives] = useState(() => readJSON(OBJECTIVE_CHECK_KEY, {}));
  const [completedQuests, setCompletedQuests] = useState(() => readJSON(COMPLETE_KEY, []));
  const [hiddenObjectives, setHiddenObjectives] = useState(() => readJSON(HIDDEN_KEY, {}));

  /* ---------------- STATE ---------------- */
  const [search, setSearch] = useState("");
  const [objectiveLocations, setObjectiveLocations] = useState([]);
  const [selectedTraders, setSelectedTraders] = useState([]);
  const [currentQuestId, setCurrentQuestId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  /* แผงข้างเปิดค้างไว้ได้ และจำไว้ข้ามการรีเฟรช — ตั้งค่าพวกนี้เป็นของที่ปรับบ่อย
     ตอนไล่ทำเควส ไม่ใช่ของที่เปิดครั้งเดียวจบ */
  const [drawerOpen, setDrawerOpen] = usePersisted(DRAWER_KEY, false);
  const [traderLevels, setTraderLevels] = useState(() => QuestComponent.getTraderLevels());
  const [onlyTurnIn, setOnlyTurnIn] = useState(false);
  const [suggest, setSuggest] = useState(null);       // { trader, quests } หลังทำเควสเสร็จ
  const [suggestOpen, setSuggestOpen] = useState(false); // กางดูทั้งหมดหรือเอาแค่ไม่กี่อันแรก
  const [suggestMin, setSuggestMin] = useState(false);   // ย่อเป็นปุ่มเล็กมุมจอ
  const [showHiddenOf, setShowHiddenOf] = useState({});   // questId -> เปิดดูรายการที่ซ่อนไว้
  const [undoSnap, setUndoSnap] = useState(null);         // ภาพ state ก่อนกด Complete ล่าสุด

  const refs = useRef({});
  const navTop = useNavbarOffset();   // ยึดแถบหนึบไว้ใต้ AppNavbar พอดี ไม่ให้มุดเข้าไปโดนบัง

  /* ความสูงจริงของแถบหนึบ -> ตัวแปร CSS --head-h ให้รายการเควสด้านซ้ายยึดตาม
     แถบนี้ยืดหดได้ (ยุบตัวกรองตอนเลื่อน / ซ่อนตอนค้นหา / ไม่มีแมพให้เลือก)
     เลยวัดเอาแทนตัวเลขตายตัว ไม่งั้นการ์ดที่กระโดดไปหาจะไปจอดใต้แถบพอดี

     เขียนลง style ของ element ตรง ๆ ไม่ผ่าน state — ค่านี้เปลี่ยนรัว ๆ ระหว่าง
     transition ถ้าเข้า state จะลากให้เรนเดอร์ทั้งหน้าใหม่ทุกเฟรม */
  const rootRef = useRef(null);
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    const root = rootRef.current;
    if (!el || !root || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      root.style.setProperty('--head-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* เคยลองให้แถวตัวกรองยุบเองตอนเลื่อนลง แต่มันเป็นของที่แตะบ่อยระหว่างไล่ทำเควส
     โผล่ ๆ หาย ๆ เลยกวนกว่าได้ที่คืนมา -> โชว์ค้างไว้ตลอด
     ที่กันไม่ให้แถบสูงจนบังเควสคือการให้แต่ละแถวเลื่อนแนวนอนแทนการตัดบรรทัด */

  // Esc ปิดแผงข้าง — บนจอแคบแผงทับเนื้อหาอยู่ ต้องมีทางออกที่ไม่ต้องเล็งปุ่ม
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, setDrawerOpen]);

  const scrollTo = (id) => {
    const el = refs.current[id];
    if (!el) return;
    // เผื่อที่ให้ navbar + แถบหนึบ ไม่งั้นการ์ดที่กระโดดไปจะไปอยู่ใต้แถบพอดี
    const offset = navTop + (headerRef.current?.getBoundingClientRect().height || 0) + 12;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - offset, behavior: "smooth" });
  };

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedQuests(readJSON(STORAGE_KEY, []));
      setCheckedObjectives(readJSON(OBJECTIVE_CHECK_KEY, {}));
      setCompletedQuests(readJSON(COMPLETE_KEY, []));
      setHiddenObjectives(readJSON(HIDDEN_KEY, {}));
    };
    /* เก็บกวาดเควสผิดฝ่ายที่ค้างอยู่จากก่อนหน้านี้ — การสแกนรูปใน Add Quest เคยไม่กรองฝ่าย
       เลยมีโอกาสเพิ่มเวอร์ชันของอีกฝ่ายเข้ามา (Textile / Drip-Out ชื่อเหมือนกันทั้งสองฝ่าย) */
    const stale = readJSON(STORAGE_KEY, []).filter((q) => !QuestComponent.inFaction(q));
    if (stale.length) QuestComponent.dropFromActive(stale.map((q) => q.id));

    setIsLoaded(true);
    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /* ---------------- SAVE ---------------- */
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests)); }, [selectedQuests, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(OBJECTIVE_CHECK_KEY, JSON.stringify(checkedObjectives)); }, [checkedObjectives, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenObjectives)); }, [hiddenObjectives, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(COMPLETE_KEY, JSON.stringify(completedQuests));
    if (!currentQuestId) return;
    const nextQuestList = QuestComponent.getNextQuestLists(completedQuests, currentQuestId);
    setSelectedQuests((prev) => {
      const uniqueMap = new Map([...prev, ...nextQuestList].map((q) => [q.id, q]));
      return Array.from(uniqueMap.values());
    });
  }, [completedQuests, currentQuestId, isLoaded]);

  /* ---------------- FILTER OPTIONS ---------------- */
  // ตัวเลือกคิดจาก "เควสที่เลือกไว้" เท่านั้น — ของเดิมไล่จาก quests ทั้ง 515 ตัว
  // ทำให้ขึ้นชื่อแมพ/เทรดเดอร์ที่ไม่มีอยู่ในรายการเลย (และ dep ของ useMemo ก็ผิดด้วย)
  const allLocations = useMemo(() => {
    const s = new Set();
    selectedQuests.forEach((q) => q.objectives?.forEach((o) => o.maps?.forEach((m) => m?.name && s.add(mapName(m.name)))));
    return [...s].sort();
  }, [selectedQuests]);

  const traderOptions = useMemo(
    () => [...new Set(selectedQuests.map((q) => q.trader?.name).filter(Boolean))].sort(byTraderOrder),
    [selectedQuests]
  );

  // เทรดเดอร์ทุกคนในเกม (ไม่ใช่แค่ที่มีเควสอยู่ในรายการ) — ใช้กับแผง Loyalty Level
  const traderNames = useMemo(
    () => [...new Set(quests.map((q) => q.trader?.name).filter(Boolean))].sort(byTraderOrder),
    [quests]
  );

  const toggleLocation = (name) => setObjectiveLocations((p) => p.includes(name) ? p.filter((l) => l !== name) : [...p, name]);
  const toggleTrader = (name) => setSelectedTraders((p) => p.includes(name) ? p.filter((t) => t !== name) : [...p, name]);

  /* ---------------- QUEST ACTIONS ---------------- */
  const addQuest = (quest) => {
    setSelectedQuests((prev) => prev.some((q) => q.id === quest.id) ? prev : [...prev, quest]);
    setSearch("");
  };

  const clearObjectiveProgress = useCallback((questId) => {
    setCheckedObjectives((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((k) => { if (k.startsWith(`${questId}|`)) delete updated[k]; });
      return updated;
    });
  }, []);

  const removeQuest = useCallback((questId) => {
    setSelectedQuests((prev) => prev.filter((q) => q.id !== questId));
    clearObjectiveProgress(questId);
  }, [clearObjectiveProgress]);

  const toggleObjective = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setCheckedObjectives((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleHideObjective = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setHiddenObjectives((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = true;
      return next;
    });
  };

  /* เอาเควสที่ทำจบไปแล้วกลับเข้ารายการ (จากกลุ่ม Already completed ในช่องค้นหา)
     ต้องถอดออกจากประวัติด้วย ไม่งั้นยังนับว่าเสร็จอยู่แล้วไปโผล่ในกลุ่มเดิมซ้ำ */
  const restoreQuest = (quest) => {
    setCompletedQuests((prev) => prev.filter((q) => q.id !== quest.id));
    setSelectedQuests((prev) => prev.some((q) => q.id === quest.id) ? prev : [...prev, quest]);
    setSearch('');
  };

  /* กด Complete แล้วเรียกคืนได้
     การกดเสร็จไปทีเดียวแตะ state หลายตัว (รายการที่รับไว้ ประวัติ ความคืบหน้า
     และยังลากเควสก่อนหน้าไปเป็นเสร็จด้วย) การเขียน logic ย้อนทีละขั้นจึงพลาดง่าย
     -> เก็บภาพ state ก่อนกดไว้ทั้งก้อน แล้ว undo = วางกลับ */
  const undoComplete = () => {
    if (!undoSnap) return;
    setSelectedQuests(undoSnap.selected);
    setCompletedQuests(undoSnap.completed);
    setCheckedObjectives(undoSnap.checked);
    /* ตั้งเป็น null ไม่ใช่ค่าเดิม — effect ที่ดูค่านี้จะได้ออกตั้งแต่ต้น
       ไม่ไปยัดเควสสายต่อกลับเข้ารายการที่เพิ่งวางคืน */
    setCurrentQuestId(null);
    setSuggest(null);
    setUndoSnap(null);
  };

  // ป้าย Undo หายเองใน 12 วิ — นานพอให้รู้ตัว แต่ไม่ค้างจนลืมว่ามันคืออะไร
  useEffect(() => {
    if (!undoSnap) return undefined;
    const t = setTimeout(() => setUndoSnap(null), 12000);
    return () => clearTimeout(t);
  }, [undoSnap]);

  const nextQuest = (questId) => {
    const done = quests.find((q) => q.id === questId);
    // ภาพก่อนแก้ — ค่าพวกนี้คือของรอบเรนเดอร์ปัจจุบัน ยังไม่โดน setState ข้างล่างแตะ
    setUndoSnap({
      name: done?.name || 'Quest',
      selected: selectedQuests,
      completed: completedQuests,
      checked: checkedObjectives,
    });
    const newCompleted = QuestComponent.getPreviousQuestsList(questId, completedQuests);
    const idsToRemove = new Set(newCompleted.map((u) => u.id));
    idsToRemove.add(questId);
    idsToRemove.forEach(removeQuest);
    setCurrentQuestId(questId);
    setCompletedQuests((prev) => {
      const byId = new Map(prev.map((q) => [q.id, q]));
      newCompleted.forEach((q) => byId.set(q.id, q));
      return Array.from(byId.values());
    });

    /* เควสสายต่อ (leads to) ถูกเพิ่มอัตโนมัติอยู่แล้วใน effect ของ completedQuests
       แต่ 301 จาก 504 เควสไม่มีเงื่อนไขเควสก่อนหน้า (ปลดล็อกด้วย Loyalty Level
       + เลเวลผู้เล่นซึ่งแอปไม่รู้) -> getNextQuestLists ตัดทิ้งหมด
       เสนอของเทรดเดอร์คนเดิมให้เลือกเอง ไม่ยัดเข้ารายการ และไม่ดูเลเวล */
    const trader = done?.trader?.name;
    if (!trader) return;
    const stillActive = selectedQuests.filter((q) => !idsToRemove.has(q.id));

    /* เสนอเฉพาะตอน "เคลียร์คิวของเทรดเดอร์คนนั้นหมดแล้ว"
       ของเดิมเสนอทุกครั้งที่ทำเสร็จ ซึ่งทวีคูณ: เพิ่มทีละ 8 แล้วทำเสร็จทั้ง 8
       ก็เด้งข้อเสนออีก 8 ครั้ง ๆ ละ 8 อัน รายการบวมจนรก
       ถ้ายังมีเควสของเทรดเดอร์นี้ค้างอยู่ แปลว่ายังมีงานให้ทำ ไม่ต้องเสนอเพิ่ม */
    if (stillActive.some((q) => q.trader?.name === trader)) {
      setSuggest(null);
      return;
    }

    // ดึงมาทั้งหมด แล้วค่อยตัดแสดงในการ์ด — ปุ่ม "Add all" จะได้รู้จำนวนจริง
    const picks = QuestComponent.getTraderSuggestions(trader, {
      completed: [...completedQuests, ...newCompleted, { id: questId }],
      active: stillActive,
      limit: Infinity,
    });
    setSuggestOpen(false); setSuggestMin(false);
    setSuggest(picks.length ? { trader, quests: picks } : null);
  };

  /* เพิ่มหลายเควสพร้อมกัน — ใช้กับปุ่ม Add all ในการ์ดแนะนำ
     เขียน state รอบเดียว ไม่งั้นเรียก addQuest ทีละตัวจะทับกันเพราะอ่าน prev คนละรอบ */
  const addQuests = (list) => {
    if (!list.length) return;
    setSelectedQuests((prev) => {
      const byId = new Map(prev.map((q) => [q.id, q]));
      list.forEach((q) => { if (!byId.has(q.id)) byId.set(q.id, q); });
      return Array.from(byId.values());
    });
  };

  /* ---------------- SEARCH ---------------- */
  // 12 เควสแยกฝ่าย BEAR/USEC — ไม่กรองแล้วจะเผลอเพิ่มของฝ่ายตรงข้ามเข้ารายการ
  // (ฝ่ายสลับได้ที่ AppNavbar)
  /* ค้นหาครอบคลุมทั้งสามสถานะ
     ของเดิมตัดเควสที่รับไว้แล้วทิ้ง (เพราะช่องนี้มีไว้ "เพิ่มเควส" อย่างเดียว)
     พอรายการโตเป็นหลายสิบอันเลยตอบคำถามที่ถามบ่อยสุดไม่ได้ — "เควสนี้เรามีหรือยัง"
     ตอนนี้แยกเป็น รับไว้แล้ว / ทำจบไปแล้ว / ยังไม่ได้รับ */
  const searchHits = useMemo(() => {
    const hits = QuestComponent.splitSearchHits(search, {
      quests, active: selectedQuests, completed: completedQuests,
    });
    return hits && { ...hits, total: hits.active.length + hits.done.length + hits.add.length };
  }, [search, quests, selectedQuests, completedQuests]);

  /* กระโดดไปการ์ดเควสในรายการ — ถ้ามันถูกตัวกรองซ่อนอยู่ การ์ดจะไม่มีใน DOM
     เลยต้องล้างตัวกรองก่อน แล้วรอให้เรนเดอร์เสร็จค่อยเลื่อน */
  const jumpToQuest = (id) => {
    setSearch('');
    if (!visibleQuests.some((q) => q.id === id)) {
      setObjectiveLocations([]);
      setSelectedTraders([]);
      setOnlyTurnIn(false);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(id)));
  };

  const progressOf = useCallback((quest) => progressOfQuest(quest, checkedObjectives), [checkedObjectives]);

  /* เควสที่ติ๊ก objective บังคับครบแล้ว = ส่งงานได้เลย
     นี่คือตัวเลขที่ใช้ตัดสินใจจริงตอนเปิดหน้านี้ ("ตอนนี้ส่งอะไรได้แล้ว")
     ไม่ใช่ % รวมของรายการ ซึ่งตัวหารโตขึ้นทุกครั้งที่รับเควสใหม่ -> ทำ Debut จบได้ 100%
     พอรับอีก 2 เควสเหลือ 17% ทั้งที่ไม่ได้ทำอะไรผิด วัดอะไรไม่ได้เลย */
  const turnInIds = useMemo(() => {
    const s = new Set();
    selectedQuests.forEach((q) => {
      const { done, total } = progressOf(q);
      if (total > 0 && done === total) s.add(q.id);
    });
    return s;
  }, [selectedQuests, progressOf]);

  /* ---------------- รายการที่จะแสดง ---------------- */
  const visibleQuests = useMemo(() => selectedQuests.filter((quest) => {
    if (onlyTurnIn && !turnInIds.has(quest.id)) return false;
    if (selectedTraders.length && !selectedTraders.includes(quest.trader?.name)) return false;
    if (objectiveLocations.length
      && !quest.objectives?.some((o) => o.maps?.some((m) => objectiveLocations.includes(mapName(m.name))))) return false;
    return true;
  /* ไม่เรียงใหม่ — เดิมดันเควสที่ส่งงานได้ขึ้นบนสุด ซึ่งฟังดูดีแต่ใช้จริงแล้วแย่:
     ติ๊ก objective ตัวสุดท้ายเสร็จปุ๊บ การ์ดที่กำลังอ่านอยู่กระโดดหายไปบนสุดทันที
     ต้องเลื่อนตามไปหาเพื่อกดปุ่ม Complete ทุกครั้ง
     อยากดูเฉพาะที่ส่งได้ก็กดชิป "Ready to turn in" ในแถบหนึบแทน */
  }),
  [selectedQuests, selectedTraders, objectiveLocations, onlyTurnIn, turnInIds]);

  const filtersOn = objectiveLocations.length + selectedTraders.length + (onlyTurnIn ? 1 : 0);

  return (
    <div
      ref={rootRef}
      className={`eft-home${drawerOpen ? ' has-drawer' : ''}`}
      style={{ background: P.bg, minHeight: '100vh', color: P.text }}
    >
      {/* เนื้อหาทั้งหน้าหลบแผงข้างด้วย margin ไม่ใช่ปล่อยให้โดนทับ
          (--drawer = 0 บนจอแคบ ที่นั่นแผงจะทับพร้อมฉากหลังแทน — home.css) */}
      <div style={{ marginRight: 'var(--drawer)', transition: 'margin-right .18s ease' }}>
        {/* ---------------- hero: เลื่อนหายไปได้ ไม่ต้องหนึบ ----------------
            วงแหวนเป็นตัวเลขสรุปที่ดูตอนเปิดหน้าครั้งเดียวก็พอ ไม่ได้ใช้ตอนไล่ทำเควส
            จึงปล่อยให้เลื่อนหายไป แล้วเก็บเฉพาะของที่ใช้จริงไว้ในแถบหนึบด้านล่าง */}
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '18px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200 }}>
              <h1 style={{ fontSize: '21px', fontWeight: 900, margin: 0 }}>
                <span style={{ color: P.blue }}>EFT</span> <span style={{ color: P.gold }}>TaskTrack</span>
              </h1>
              {/* ตัวเลขนี้คือ "ทั้งหมดที่รับไว้" เสมอ ไม่ขยับตามตัวกรอง
                  ถ้ากรองอยู่จะบอกต่อท้ายว่าตอนนี้เห็นกี่อัน กันสับสนกับเลขในรายการซ้าย */}
              <div style={{ ...label, marginTop: 3 }}>
                {selectedQuests.length} quests
                {visibleQuests.length !== selectedQuests.length && (
                  <span style={{ color: P.blue }}> · showing {visibleQuests.length}</span>
                )}
              </div>
            </div>

            {/* สิ่งที่ต้องลงมือทำ ไม่ใช่ % ที่วัดอะไรไม่ได้ */}
            {turnInIds.size > 0 && (
              <div style={{
                ...card, padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 11,
                borderColor: `${P.green}66`, background: `${P.green}14`,
              }}>
                <span style={{ color: P.green, display: 'flex' }}><Icons.Check size={18} /></span>
                <div>
                  <div style={{ fontSize: 19.5, fontWeight: 900, color: P.green, lineHeight: 1 }}>
                    {turnInIds.size}
                  </div>
                  <div style={{ ...label, marginTop: 3 }}>ready to turn in</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---------------- แถบหนึบ: ค้นหา + ตัวกรอง + ความคืบหน้าแบบบาง ---------------- */}
        <header ref={headerRef} style={{
          position: 'sticky', top: navTop, zIndex: 30,
          background: 'rgba(11,18,34,.95)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${P.border}`,
        }}>
          <div style={{ maxWidth: 1500, margin: '0 auto', padding: '10px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Search a quest to add..." width={320} />

              {/* LL ที่กรอกเองเป็นตัวตัดกองเควสที่ยังเปิดไม่ถึงออกจากข้อเสนอ
                  — ปรับไม่บ่อยเท่าตัวกรอง เลยยังเก็บไว้ในแผงข้าง */}
              <span style={chip(drawerOpen, P.gold)} onClick={() => setDrawerOpen((v) => !v)}>
                <Icons.Crown size={13} /> Loyalty
              </span>
              {filtersOn > 0 && (
                <span
                  style={{ ...label, cursor: 'pointer', color: P.red }}
                  onClick={() => { setObjectiveLocations([]); setSelectedTraders([]); setOnlyTurnIn(false); }}
                >
                  Clear
                </span>
              )}

              {/* กรองให้เหลือเฉพาะเควสที่ส่งงานได้ — ติดไปกับแถบหนึบ กดได้ตลอดตอนเลื่อน */}
              {turnInIds.size > 0 && (
                <span
                  style={{ ...chip(onlyTurnIn, P.green), marginLeft: 'auto' }}
                  onClick={() => setOnlyTurnIn((v) => !v)}
                >
                  <Icons.Check size={13} /> Ready to turn in
                  <span style={{ opacity: .7 }}>{turnInIds.size}</span>
                </span>
              )}
            </div>

            {/* ---- ตัวกรองวางไว้ตรงนี้เลย ไม่ต้องกดปุ่มเปิด ----
                เดิมซ่อนอยู่หลังปุ่ม Filters ซึ่งต้องกดเข้าไปทุกครั้งที่อยากสลับแมพ
                ทั้งที่มันคือของที่แตะบ่อยสุดตอนไล่ทำเควส

                แต่ละแถวเลื่อนแนวนอนแทนการตัดบรรทัด (nowrap + overflowX) —
                แถบหนึบจะได้สูงคงที่สองแถว ไม่ว่าจะมีกี่แมพกี่เทรดเดอร์
                ไม่งั้นมันจะกลับไปบังการ์ดเควสเหมือนเดิม

                ซ่อนตอนพิมพ์ค้นหา เพื่อให้ผลการค้นหาอยู่ติดช่องค้นหา
                นอกนั้นโชว์ค้างไว้ตลอด เป็นของที่แตะบ่อย */}
            {!search.trim() && (allLocations.length > 0 || traderOptions.length > 0) && (
              <div className="eft-filters">
                <FilterRow title="Maps" empty="no map-based objectives">
                  {allLocations.map((loc) => (
                    <span key={loc} style={chip(objectiveLocations.includes(loc), P.blue)} onClick={() => toggleLocation(loc)}>
                      {loc}
                    </span>
                  ))}
                </FilterRow>
                <FilterRow title="Traders" empty="no quests added">
                  {traderOptions.map((t) => {
                    const color = TRADER_THEMES[t]?.bg || P.label;
                    return (
                      <span key={t} style={chip(selectedTraders.includes(t), color)} onClick={() => toggleTrader(t)}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />
                        {t}
                      </span>
                    );
                  })}
                </FilterRow>
              </div>
            )}

            {/* ผลการค้นหา — ขึ้นใต้ช่องค้นหาทันที
                แยกตามสถานะ เพื่อให้เห็นในทีเดียวว่าเควสที่หาอยู่ "เรามีหรือยัง" */}
            {searchHits && (
              <div style={{ ...card, marginTop: 10, padding: 8, maxHeight: 420, overflowY: 'auto' }}>
                {searchHits.total === 0 && (
                  <div style={{ ...label, padding: '8px 6px' }}>No quest found</div>
                )}

                {searchHits.active.length > 0 && (
                  <>
                    <SearchGroup title="In your list" hint="click to jump to it" color={P.gold} />
                    {searchHits.active.map((q) => {
                      const { done, total } = progressOf(q);
                      return (
                        <SearchRow key={q.id} quest={q} onClick={() => jumpToQuest(q.id)}>
                          <span style={{ ...label, fontVariantNumeric: 'tabular-nums' }}>{done}/{total}</span>
                          <span style={badge(total > 0 && done === total ? P.green : P.gold)}>
                            {total > 0 && done === total ? 'Turn in' : 'Go'}
                          </span>
                        </SearchRow>
                      );
                    })}
                  </>
                )}

                {searchHits.done.length > 0 && (
                  <>
                    {/* กดได้ด้วย — ทางออกสำหรับคนที่เผลอกด Complete แล้วเพิ่งมารู้ตัวทีหลัง
                        (ถ้ารู้ตัวทันที ใช้ปุ่ม Undo ที่เด้งมามุมซ้ายล่างได้เลย) */}
                    <SearchGroup title="Already completed" hint="click to put it back" color={P.green} />
                    {searchHits.done.map((q) => (
                      <SearchRow key={q.id} quest={q} onClick={() => restoreQuest(q)}>
                        <span style={badge(P.green)}>✓ Done</span>
                        <span style={badge(P.blue)}>↩ Add back</span>
                      </SearchRow>
                    ))}
                  </>
                )}

                {searchHits.add.length > 0 && (
                  <>
                    <SearchGroup title="Not added yet" color={P.blue} />
                    {searchHits.add.map((q) => (
                      <SearchRow key={q.id} quest={q} onClick={() => addQuest(q)}>
                        {q.minPlayerLevel > 1 && <span style={badge(P.label)}>LV {q.minPlayerLevel}</span>}
                        <span style={badge(P.green)}>+ Add</span>
                      </SearchRow>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </header>


        {/* เสนอเควสต่อของเทรดเดอร์คนเดิมหลังทำเสร็จ — พวกนี้ไม่มีเงื่อนไขเควสก่อนหน้า
            ระบบเลยเพิ่มให้เองไม่ได้ ต้องให้เลือก เรียงตามลำดับในสายเทรดเดอร์

            ลอยติดมุมจอ ไม่ใช่วางบนสุดของรายการ — ปุ่ม ✓ อยู่ตามการ์ดเควสซึ่งกระจายอยู่
            ทั่วหน้า กดจากตัวที่อยู่ล่าง ๆ แล้วการ์ดแนะนำโผล่บนสุดก็มองไม่เห็น
            ต้องเลื่อนขึ้นไปหาทุกครั้ง */}
        {/* ---------------- การ์ดเสนอเควส ---------------- *
            ลอยมุมขวาล่าง ไม่วางบนสุดของรายการ — ปุ่ม ✓ กระจายอยู่ทั่วหน้า
            กดจากตัวล่าง ๆ แล้วการ์ดโผล่บนสุดก็มองไม่เห็น
            ย่อเป็นปุ่มเล็กได้ เพราะบางทีกำลังอ่าน objective อยู่แล้วไม่อยากให้บัง */}
        {/* ---------------- ป้าย Undo หลังกด Complete ---------------- *
            มุมซ้ายล่าง — มุมขวาล่างเป็นที่ของการ์ดเสนอเควส ซึ่งเด้งพร้อมกันได้
            การ์ดเสนอเควสเกิดจากการกด Complete ครั้งเดียวกัน ถ้าทับกันจะกดไม่ถูกตัว */}
        {undoSnap && (
          <div style={{
            position: 'fixed', left: 20, bottom: 20, zIndex: 60,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 13px 11px 15px', borderRadius: 12,
            background: '#16223c', border: `1px solid ${P.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,.45)', maxWidth: 'min(420px, calc(100vw - 40px))',
          }}>
            <span style={{ color: P.green, display: 'flex', flexShrink: 0 }}><Icons.Check size={17} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{
                display: 'block', fontSize: 14.5, fontWeight: 700, color: P.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {undoSnap.name}
              </span>
              <span style={{ ...label, display: 'block', marginTop: 2 }}>marked complete</span>
            </span>
            <button
              onClick={undoComplete}
              style={{
                ...chip(true, P.gold), flexShrink: 0, border: `1px solid ${P.gold}`,
                background: `${P.gold}22`, padding: '7px 13px',
              }}
            >
              ↩ Undo
            </button>
            <button
              title="Dismiss"
              onClick={() => setUndoSnap(null)}
              style={{
                width: 26, height: 26, flexShrink: 0, borderRadius: 7, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${P.border}`, background: 'transparent', color: P.dim,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {suggest && (suggestMin ? (
          <button
            className="suggest-card"
            onClick={() => setSuggestMin(false)}
            title={`${suggest.quests.length} quests from ${suggest.trader}`}
            style={{
              position: 'fixed', right: 'calc(20px + var(--drawer))', bottom: 20, zIndex: 50,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${P.gold}66`,
              background: 'linear-gradient(180deg,#1d2440 0%,#141c33 100%)',
              boxShadow: '0 10px 28px rgba(0,0,0,.5)',
              color: P.text, fontSize: 15, fontWeight: 700,
            }}
          >
            <span style={{
              width: 10, height: 10, borderRadius: 999,
              background: TRADER_THEMES[suggest.trader]?.bg || P.gold,
            }} />
            {suggest.trader}
            <span style={badge(P.gold)}>{suggest.quests.length}</span>
            <span style={{ color: P.dim, display: 'flex' }}><Icons.ChevronUp size={17} /></span>
          </button>
        ) : (
          <div className="suggest-card" style={{
            ...card, padding: 16,
            position: 'fixed', right: 'calc(20px + var(--drawer))', bottom: 20, zIndex: 50,
            width: 'min(560px, calc(100vw - 32px))',
            maxHeight: 'min(70vh, 640px)', overflowY: 'auto',
            borderColor: `${P.gold}55`,
            background: 'linear-gradient(180deg,#1d2440 0%,#141c33 100%)',
            boxShadow: '0 12px 34px rgba(0,0,0,.55)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{
                width: 5, height: 24, borderRadius: 3, flexShrink: 0,
                background: TRADER_THEMES[suggest.trader]?.bg || P.gold,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  {suggest.newLevel
                    ? `${suggest.trader} reached LL${suggest.newLevel}`
                    : `More from ${suggest.trader}`}
                </div>
                <div style={{ ...label, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
                  {suggest.newLevel
                    ? `${suggest.quests.length} quest${suggest.quests.length > 1 ? 's' : ''} just opened up`
                    : 'unlocked by loyalty level, not by a previous quest'}
                </div>
              </div>
              <button
                onClick={() => setSuggestMin(true)}
                title="Minimise"
                style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <Icons.ChevronDown size={19} />
              </button>
              <button
                onClick={() => setSuggest(null)}
                title="Dismiss"
                style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', display: 'flex', padding: 4 }}
              >
                <Icons.Close size={19} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 5 }}>
              {(suggestOpen ? suggest.quests : suggest.quests.slice(0, SUGGEST_PREVIEW)).map((q) => (
                <div
                  key={q.id}
                  onClick={() => {
                    addQuest(q);
                    setSuggest((s) => {
                      const rest = s.quests.filter((x) => x.id !== q.id);
                      return rest.length ? { ...s, quests: rest } : null;
                    });
                  }}
                  title="Add to your active quests"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                    background: P.inputBg, border: `1px solid ${P.borderSoft}`,
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: 7,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${P.gold}66`, background: `${P.gold}1c`,
                    color: P.gold, fontSize: 16, fontWeight: 800, lineHeight: 1,
                  }}>+</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 600 }}>
                    {q.name}
                  </span>
                  {q.loyalty?.level && <span style={badge(P.gold)}>LL {q.loyalty.level}</span>}
                  {q.minPlayerLevel > 1 && <span style={badge(P.label)}>LV {q.minPlayerLevel}</span>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {(() => {
                const shown = suggestOpen ? suggest.quests : suggest.quests.slice(0, SUGGEST_PREVIEW);
                return (
                  <button
                    onClick={() => { addQuests(shown); setSuggest(null); }}
                    title={`Add ${shown.length} quest${shown.length > 1 ? 's' : ''} to your list`}
                    style={{
                      padding: '9px 18px', borderRadius: 999, cursor: 'pointer',
                      fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap',
                      border: `1px solid ${P.green}`, background: `${P.green}22`, color: P.green,
                    }}
                  >
                    + Add all ({shown.length})
                  </button>
                );
              })()}
              {/* บางเทรดเดอร์มีถึง 46 อัน ไม่กางทั้งหมดตั้งแต่แรก */}
              {suggest.quests.length > SUGGEST_PREVIEW && (
                <span
                  onClick={() => setSuggestOpen((v) => !v)}
                  style={{ ...label, cursor: 'pointer', color: P.blue }}
                >
                  {suggestOpen ? '▴ Show fewer' : `▾ Show all ${suggest.quests.length}`}
                </span>
              )}
            </div>
          </div>
        ))}

        <main style={{ maxWidth: 1500, margin: '0 auto', padding: '18px 20px 64px' }}>
          {selectedQuests.length === 0 ? (
            <Empty
              icon={<Icons.Book size={44} />}
              title="No active quests yet"
              hint="Search a quest above to add it, or scan your in-game quest list on the Add Quest page."
            />
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* ---------------- รายการเควสด้านซ้าย ---------------- */}
              <aside style={{
                ...card, width: 350, flexShrink: 0, padding: 12,
                // ใต้ navbar + แถบหนึบที่วัดความสูงจริง (ยืดหดตามแถวตัวกรอง)
                position: 'sticky', top: `calc(${navTop + 12}px + var(--head-h, 130px))`,
                maxHeight: `calc(100vh - ${navTop + 32}px - var(--head-h, 130px))`, overflowY: 'auto',
              }}>
                <div style={{ ...label, marginBottom: 9 }}>
                  {visibleQuests.length === selectedQuests.length
                    ? `Active quests (${selectedQuests.length})`
                    : `Showing ${visibleQuests.length} of ${selectedQuests.length}`}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {visibleQuests.map((quest) => {
                    const { done, total } = progressOf(quest);
                    const complete = total > 0 && done === total;
                    return (
                      <div
                        key={quest.id}
                        onClick={() => scrollTo(quest.id)}
                        style={{
                          display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 9px',
                          borderRadius: 9, cursor: 'pointer',
                          background: P.inputBg, border: `1px solid ${complete ? `${P.green}66` : P.borderSoft}`,
                        }}
                      >
                        <span style={{
                          width: 4, height: 34, borderRadius: 2, flexShrink: 0, marginTop: 1,
                          background: TRADER_THEMES[quest.trader?.name]?.bg || '#334155',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14.5, fontWeight: 700, color: complete ? P.green : P.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {quest.name}
                          </div>
                          <div style={{ ...label, margin: '3px 0 5px' }}>
                            {quest.trader?.name}{quest.minPlayerLevel > 1 ? ` · LV ${quest.minPlayerLevel}` : ''}
                          </div>
                          {complete
                            ? <span style={{ ...badge(P.green), display: 'inline-block' }}>Turn in</span>
                            : <Bar value={done} total={total} height={4} color={P.gold} />}
                        </div>
                        <span style={{ ...label, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{done}/{total}</span>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* ---------------- การ์ด objective ด้านขวา ---------------- */}
              <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 14 }}>
                {visibleQuests.length === 0 && (
                  <Empty icon={<Icons.Filter size={40} />} title="No quests match these filters" />
                )}

                {visibleQuests.map((quest) => {
                  const keyOf = (o) => getObjectiveKey(quest.id, o.id);
                  const isHidden = (o) => !!hiddenObjectives[keyOf(o)];
                  const all = quest.objectives || [];
                  const visibleObjs = all.filter((o) => !isHidden(o));
                  const hiddenCount = all.length - visibleObjs.length;
                  const openHidden = showHiddenOf[quest.id];

                  const inLocation = (o) => objectiveLocations.length === 0
                    || o.maps?.some((m) => objectiveLocations.includes(mapName(m.name)));

                  const shown = (openHidden ? all : visibleObjs);
                  const handOver = shown.filter((o) => o.type === 'giveItem');
                  const others = shown.filter((o) => o.type !== 'giveItem' && inLocation(o));
                  const { done, total, optDone, optTotal } = progressOf(quest);
                  const trader = TRADER_THEMES[quest.trader?.name] || { bg: '#334155' };
                  // กุญแจที่ต้องพกเข้าไป — ไม่ได้อยู่ใน objective ไหนเลย
                  // ถ้าไม่บอกไว้ก็รู้ตัวอีกทีตอนยืนอยู่หน้าประตูแล้ว
                  const keys = QuestComponent.questKeys(quest);

                  // แถบบอกความคืบหน้าของ "ทั้งเควส" เสมอ ส่วนการ์ดอาจโชว์ไม่ครบเพราะตัวกรอง/การซ่อน
                  // ถ้าไม่บอกตรงนี้จะดูเหมือนตัวเลขผิด
                  const shownCount = handOver.length + others.length;
                  const notes = [];
                  if (shownCount !== all.length) notes.push(`showing ${shownCount} of ${all.length}`);
                  if (hiddenCount > 0) notes.push(`${hiddenCount} hidden`);
                  // optional ไปอยู่คอลัมน์ขวาใต้แถบ — เป็นตัวเลขความคืบหน้าเหมือนกัน
                  // อยู่ติดกันแล้วเทียบง่ายกว่าแยกไปปนกับ note ฝั่งซ้าย

                  return (
                    <section
                      key={quest.id}
                      ref={(el) => (refs.current[quest.id] = el)}
                      // ไม่ใส่ overflow:hidden เพราะจะไปตัดรูปตอน hover ที่ขยาย 2.5 เท่า
                      // มุมโค้งของหัวการ์ดเลยกำหนดที่ตัวหัวการ์ดเองแทน
                      style={card}
                    >
                      {/* หัวการ์ด */}
                      <div style={{
                        // wrap ไว้ให้คอลัมน์กุญแจตกลงมาข้างล่างบนจอแคบ แทนที่จะไปบีบชื่อเควส
                        display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
                        padding: '13px 15px',
                        borderBottom: `1px solid ${P.borderSoft}`, background: '#16223c',
                        borderRadius: '13px 13px 0 0',
                      }}>
                        <span style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, background: trader.bg }} />
                        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                          <a
                            href={quest.wikiLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: 17.5, fontWeight: 800, color: P.text, textDecoration: 'none' }}
                          >
                            {quest.name}
                          </a>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                            <span style={badge(trader.bg)}>{quest.trader?.name}</span>
                            {quest.minPlayerLevel > 1 && <span style={badge(P.label)}>LV {quest.minPlayerLevel}</span>}
                            <span style={badge(P.blue)}>{(quest.experience || 0).toLocaleString()} XP</span>
                            {quest.kappaRequired && <span style={badge(P.gold)}>Kappa</span>}
                            {quest.lightkeeperRequired && <span style={badge('#38bdf8')}>Lightkeeper</span>}
                          </div>

                          {/* กุญแจอยู่ฝั่งซ้ายใต้ป้าย — เป็นของที่ต้องรู้ตั้งแต่ก่อนลงแมพ
                              ไม่ใช่ตอนไล่อ่าน objective เลยต้องเห็นพร้อมชื่อเควส */}
                          {keys.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 9 }}>
                              <span style={{ ...label, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Icons.Lock size={12} /> Keys
                              </span>
                              {keys.map((k) => <KeyChip key={k.id} item={k} showMap />)}
                            </div>
                          )}

                          {notes.length > 0 && (
                            <div style={{ ...label, marginTop: 7, textTransform: 'none', letterSpacing: 0 }}>
                              {notes.join(' · ')}
                            </div>
                          )}
                        </div>

                        {/* คอลัมน์ขวา: ปุ่มบน ความคืบหน้าล่าง
                            Bar กว้าง 100% ของพ่อ -> ต้องตรึงความกว้างคอลัมน์ไว้
                            ไม่งั้นแถบจะกว้างเท่าตัวเลข "0/2" แล้วมองไม่ออกว่าคืบไปเท่าไร */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                          gap: 10, flexShrink: 0, width: 160,
                        }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <MiniButton title="Mark complete" color={P.green} onClick={() => nextQuest(quest.id)}>
                              <Icons.Check size={14} />
                            </MiniButton>
                            <MiniButton title="Remove from list" color={P.red} onClick={() => removeQuest(quest.id)}>
                              <Icons.Close size={14} />
                            </MiniButton>
                          </div>

                          <div style={{ width: '100%' }}>
                            <div style={{
                              display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7,
                              marginBottom: 6,
                            }}>
                              <span style={{
                                fontSize: 17, fontWeight: 900, lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums',
                                color: total > 0 && done === total ? P.green : P.text,
                              }}>
                                {done}/{total}
                              </span>
                              <span style={label}>{total > 0 && done === total ? 'ready' : 'objectives'}</span>
                            </div>
                            <Bar value={done} total={total} height={5} color={done === total && total > 0 ? P.green : P.gold} />
                            {optTotal > 0 && (
                              <div style={{
                                ...label, marginTop: 6, textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {optDone}/{optTotal} optional
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '13px 15px' }}>
                        {/* ของที่ต้องส่งมอบ */}
                        {handOver.length > 0 && (
                          <>
                            <div style={{ ...label, marginBottom: 9 }}>Hand over</div>
                            {/* ใช้ flex-wrap ไม่ใช่ grid คอลัมน์ตายตัว — ไอเทมอย่างปืนยาว/รางปืน
                                ไอคอนกว้างกว่าช่อง 96px มาก ของเดิมรูปเลยล้นออกนอกกรอบ
                                แบบนี้กรอบกว้างตามรูป (สูงสุด 220px) ของชิ้นเล็กก็ยังกว้าง 96px เท่าเดิม */}
                            <div style={{
                              display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16,
                              alignItems: 'stretch',
                            }}>
                              {handOver.map((obj) => {
                                const checked = checkedObjectives[keyOf(obj)];
                                const hidden = isHidden(obj);
                                return (
                                  <div
                                    key={keyOf(obj)}
                                    onClick={() => toggleObjective(quest.id, obj.id)}
                                    title={obj.description}
                                    style={{
                                      position: 'relative', padding: '10px 8px 8px', borderRadius: 10,
                                      cursor: 'pointer', textAlign: 'center', opacity: hidden ? .45 : 1,
                                      border: `1px solid ${checked ? P.green : P.borderSoft}`,
                                      // พื้นตามระดับไอเทมของเกม ทำให้กวาดตาหาของถูกชิ้นได้เร็วกว่าพื้นสีเดียวหมด
                                      background: checked ? `${P.green}22` : itemBg(obj.item),
                                      minWidth: 96, maxWidth: 236, flex: '0 1 auto',
                                      display: 'flex', flexDirection: 'column',
                                      alignItems: 'center', justifyContent: 'flex-end',
                                    }}
                                  >
                                    <button
                                      title={hidden ? 'Unhide' : 'Hide'}
                                      onClick={(e) => { e.stopPropagation(); toggleHideObjective(quest.id, obj.id); }}
                                      style={{
                                        position: 'absolute', top: 3, right: 3, width: 20, height: 20,
                                        borderRadius: 6, cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        border: 'none', background: 'rgba(0,0,0,.35)', color: P.dim,
                                      }}
                                    >
                                      <Icons.Ban size={11} />
                                    </button>
                                    {obj.item?.iconLink && (
                                      <img
                                        src={obj.item.iconLink} alt={obj.item.name} className="objective-img"
                                        style={{
                                          height: 52, width: 'auto', maxWidth: 220,
                                          objectFit: 'contain', display: 'block',
                                        }}
                                      />
                                    )}
                                    <div style={{
                                      fontSize: 13, fontWeight: 700, marginTop: 5, maxWidth: 220,
                                      color: checked ? P.dim : P.text,
                                      textDecoration: checked ? 'line-through' : 'none',
                                    }}>
                                      {obj.item?.shortName || 'item'}
                                      <span style={{ color: P.blue }}> ×{obj.count}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* objective อื่น ๆ */}
                        {others.length > 0 && (
                          <>
                            <div style={{ ...label, marginBottom: 9 }}>Objectives</div>
                            <div style={{ display: 'grid', gap: 7 }}>
                              {others.map((obj) => {
                                const checked = checkedObjectives[keyOf(obj)];
                                const hidden = isHidden(obj);
                                return (
                                  <div
                                    key={keyOf(obj)}
                                    onClick={() => toggleObjective(quest.id, obj.id)}
                                    style={{
                                      display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 11px',
                                      borderRadius: 10, cursor: 'pointer', opacity: hidden ? .45 : 1,
                                      border: `1px solid ${checked ? `${P.green}66` : P.borderSoft}`,
                                      background: checked ? `${P.green}14` : P.inputBg,
                                    }}
                                  >
                                    <span style={{
                                      flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      border: `1px solid ${checked ? P.green : '#2a3550'}`,
                                      background: checked ? P.green : 'transparent',
                                      color: checked ? '#06121f' : 'transparent',
                                    }}>
                                      <Icons.Check size={12} />
                                    </span>

                                    {obj.item?.iconLink && (
                                      <img
                                        src={obj.item.iconLink} alt="" className="objective-img"
                                        // ไอคอนกว้าง ๆ เคยดันข้อความจนบีบแคบ เพราะ flexShrink:0 + ไม่จำกัดความกว้าง
                                        style={{
                                          height: 42, width: 'auto', maxWidth: 150,
                                          objectFit: 'contain', flexShrink: 0,
                                        }}
                                      />
                                    )}

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{
                                        fontSize: 15, lineHeight: 1.45,
                                        color: checked ? P.dim : P.text,
                                        textDecoration: checked ? 'line-through' : 'none',
                                      }}>
                                        {obj.description}
                                        {["findItem", "shoot", "kill", "plantItem", "mark"].includes(obj.type) && obj.count > 1 && (
                                          <span style={{ color: P.blue, fontWeight: 700 }}> ×{obj.count}</span>
                                        )}
                                        {obj.optional && <span style={{ ...badge(P.dim), marginLeft: 6 }}>optional</span>}
                                      </div>
                                      {/* ยุบชื่อซ้ำก่อนโชว์ — ไม่งั้นได้ป้าย "Ground Zero" กับ
                                          "Ground Zero 21+" ติดกันทั้งที่เป็นแมพเดียวกัน */}
                                      {obj.maps?.length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                          {[...new Set(obj.maps.map((m) => mapName(m.name)))].map((name) => (
                                            <span key={name} style={badge(checked ? P.green : P.blue)}>{name}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <MiniButton
                                      title={hidden ? 'Unhide' : 'Hide this objective'}
                                      color={P.label}
                                      onClick={(e) => { e.stopPropagation(); toggleHideObjective(quest.id, obj.id); }}
                                    >
                                      <Icons.Ban size={12} />
                                    </MiniButton>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* ของเดิมซ่อนแล้วเอากลับไม่ได้เลย — ต้องมีทางเปิดดู */}
                        {hiddenCount > 0 && (
                          <div
                            onClick={() => setShowHiddenOf((p) => ({ ...p, [quest.id]: !p[quest.id] }))}
                            style={{ ...label, marginTop: 12, cursor: 'pointer', color: P.blue }}
                          >
                            {openHidden ? '▴ Hide' : '▾ Show'} {hiddenCount} hidden objective{hiddenCount > 1 ? 's' : ''}
                          </div>
                        )}

                        {/* รางวัล */}
                        {quest.finishRewards?.items?.length > 0 && (
                          <>
                            <div style={{ ...label, margin: '16px 0 9px' }}>Rewards</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {quest.finishRewards.items.map((rw) => (
                                <div
                                  key={`${quest.id}-rw-${rw.item.id}`}
                                  title={rw.item.name}
                                  style={{
                                    minWidth: 92, maxWidth: 216, padding: '8px 8px', borderRadius: 10,
                                    textAlign: 'center', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'flex-end',
                                    border: `1px solid ${P.borderSoft}`, background: itemBg(rw.item),
                                  }}
                                >
                                  <img
                                    src={rw.item.baseImageLink} alt={rw.item.name}
                                    style={{
                                      height: 44, width: 'auto', maxWidth: 200,
                                      objectFit: 'contain', display: 'block',
                                    }}
                                  />
                                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 5, maxWidth: 200 }}>
                                    {rw.item.shortName}
                                    <span style={{ color: P.blue }}> ×{rw.count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ---------------- แผงตั้งค่าด้านข้าง ---------------- *
          เดิมสองแผงนี้กางอยู่ในแถบหนึบ -> แถบสูงขึ้นแล้วเลื่อนตามจอไปบังการ์ดเควส
          ย้ายมาอยู่ขอบขวาแบบ fixed แล้วดันเนื้อหาหลบด้วย --drawer (home.css)
          เปิดค้างไว้ระหว่างไล่ทำเควสได้ ปรับแล้วเห็นผลในรายการทันที */}
      {drawerOpen && (
        <>
          <div
            className="eft-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 39, background: 'rgba(3,7,18,.6)' }}
          />
          <aside style={{
            position: 'fixed', top: navTop, right: 0, zIndex: 40,
            width: 'min(380px, 100%)', height: `calc(100vh - ${navTop}px)`,
            display: 'flex', flexDirection: 'column',
            background: P.panelBg, borderLeft: `1px solid ${P.border}`,
            boxShadow: '-8px 0 24px rgba(0,0,0,.35)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              padding: '12px 14px', borderBottom: `1px solid ${P.borderSoft}`,
            }}>
              <span style={{ ...label, flex: 1 }}>Loyalty levels</span>
              <button
                title="Close"
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: 26, height: 26, flexShrink: 0, borderRadius: 7, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${P.border}`, background: 'transparent', color: P.dim,
                }}
              >
                ✕
              </button>
            </div>

            {/* minHeight: 0 — ไม่มีอันนี้ flex item จะไม่ยอมหดต่ำกว่าเนื้อหา แล้ว overflowY ไม่ทำงาน */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14 }}>
              {/* ---- Loyalty Level ที่กรอกเอง ---- *
                  แอปไม่มีทางรู้เอง แต่มันเป็นตัวตัดสินว่าเควสไหนเปิดแล้ว
                  (Prapor 46 อัน อยู่ LL1 เหลือ 11) */}
              <div>
                <div style={{ ...label, textTransform: 'none', letterSpacing: 0, marginBottom: 12 }}>
                  used to hide quests you haven&apos;t unlocked yet from the suggestions
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {traderNames.map((t) => {
                    const color = TRADER_THEMES[t]?.bg || P.label;
                    const lvl = traderLevels[t] ?? 1;
                    return (
                      <div key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px', borderRadius: 9,
                        background: P.inputBg, border: `1px solid ${P.borderSoft}`,
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600 }}>{t}</span>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              onClick={() => {
                                const prev = traderLevels[t] ?? 1;
                                setTraderLevels(QuestComponent.setTraderLevel(t, n));
                                if (n <= prev) return;
                                /* LL ขึ้น = เควสชุดใหม่เปิด แต่ระบบเสนอเควสผูกกับ "ทำเควสเสร็จ"
                                   เลยไม่มีอะไรมาต่อจนกว่าจะไปเพิ่มเควสเองแล้วทำให้จบ
                                   -> เด้งให้เลือกตรงนี้เลย เอาเฉพาะที่เพิ่งเปิด ไม่ปนของเดิม */
                                const picks = QuestComponent.getTraderSuggestions(t, {
                                  completed: completedQuests,
                                  active: selectedQuests,
                                  aboveLevel: prev,
                                  limit: Infinity,
                                });
                                setSuggestOpen(false);
                                setSuggest(picks.length ? { trader: t, quests: picks, newLevel: n } : null);
                              }}
                              title={`Loyalty Level ${n}`}
                              style={{
                                width: 24, height: 24, borderRadius: 7, cursor: 'pointer',
                                fontSize: 13.5, fontWeight: 800,
                                border: `1px solid ${n === lvl ? P.gold : '#2a3550'}`,
                                background: n === lvl ? `${P.gold}26` : 'transparent',
                                color: n === lvl ? P.gold : P.dim,
                              }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

    </div>
  );
};

export default Home;
