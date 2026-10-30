// pages/MapPage.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback, Fragment } from 'react';
import questsStatic from "../data/tasks";
import mapFeaturesStatic from "../data/maps";
import itemsStatic from "../data/items.json";
import { useLiveData, getData } from '../data/gameStore';
import { mapStyles as styles, Icons, TRADER_THEMES } from '../Component/EftComponent';
import * as QuestComponent from '../Component/QuestComponent';
import { usePersisted, readStored } from '../Component/usePersisted';
import { KeyChip, placeNote } from '../Component/PanelUI.jsx';
import ItemTracker from './ItemTracker';
import {
  findMapLayers, usableFloors, isMarkerVisible, mapCredit,
  hasSatellite, pickTileLevel, maxUsableTileLevel, tilesFor, tileRect,
  canPlaceByBounds, posToPercent, percentToPos, boundsAspect, svgPlacement,
} from './mapLayers';

// นอก component — ค่าคงที่ ไม่ต้องสร้างใหม่ทุก render (และไม่ต้องใส่ใน deps)
const LOOT_URL = `${import.meta.env.BASE_URL}loot_data.json`;

/* ---------------- STORAGE KEYS ---------------- */
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const STORAGE_KEY = "eft_selected_quests";
const MAP_KEY = "eft_selected_map";
const COMPLETE_KEY = "eft_completed_quests";
const HIDDEN_KEY = "eft_select_quest_hidden";
const SECTIONS_KEY = "eft_map_sections";
const TAB_KEYS = ['quests', 'items', 'view'];   // 'keys' ยุบไปอยู่ในแท็บ Quests แล้ว

/* ---------------- MAP CONFIG ---------------- */
const maps = [
  { id: 0, map_name: "Factory", svg: "Factory", offsetX: 51.1, offsetZ: 54.3, scaleX: 0.76, scaleZ: 0.7, flipX: true, flipZ: true, swapXZ: true },
  { id: 1, map_name: "Customs", svg: "Customs", offsetX: 65.2, offsetZ: 56.3, scaleX: 0.094, scaleZ: 0.18, flipX: true, flipZ: false, swapXZ: false },
  { id: 2, map_name: "Woods", svg: "Woods", offsetX: 45.913, offsetZ: 67.404, scaleX: 0.0711, scaleZ: 0.0737, flipX: true, flipZ: false, swapXZ: false },
  { id: 3, map_name: "Shoreline", svg: "Shoreline", offsetX: 32.308, offsetZ: 40.174, scaleX: 0.0641, scaleZ: 0.0968, flipX: true, flipZ: false, swapXZ: false },
  { id: 4, map_name: "Interchange", svg: "Interchange", offsetX: 58.002, offsetZ: 50.922, scaleX: 0.097, scaleZ: 0.1152, flipX: true, flipZ: false, swapXZ: false },
  { id: 5, map_name: "The Lab", svg: "labs", offsetX: 161.3, offsetZ: 111, scaleX: 0.33, scaleZ: 0.33, flipX: false, flipZ: false, swapXZ: true },
  { id: 6, map_name: "Reserve", svg: "Reserve", offsetX: 48.818, offsetZ: 54.562, scaleX: 0.1689, scaleZ: 0.1862, flipX: true, flipZ: false, swapXZ: false },
  { id: 7, map_name: "Lighthouse", svg: "Lighthouse", offsetX: 48.3, offsetZ: 58, scaleX: 0.0955, scaleZ: 0.058, flipX: true, flipZ: false, swapXZ: false },
  { id: 8, map_name: "Streets of Tarkov", svg: "StreetsOfTarkov", offsetX: 53.6, offsetZ: 35.67, scaleX: 0.1657, scaleZ: 0.1206, flipX: true, flipZ: false, swapXZ: false },
  { id: 9, map_name: "Ground Zero", svg: "GroundZero", offsetX: 71.5, offsetZ: 25.5, scaleX: 0.28, scaleZ: 0.2, flipX: true, flipZ: false, swapXZ: false },
  { id: 10, map_name: "The Labyrinth", svg: "labyrinth", offsetX: 33.5, offsetZ: 50, scaleX: 0.825, scaleZ: 0.83, flipX: false, flipZ: false, swapXZ: true },
];

const getRandomColor = () => {
  let h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 90%, 65%)`;
};

const getObjectiveKey = (questId, objectiveId) =>
  `${questId}|${objectiveId}`;

/* ---------------- SIDEBAR UI STYLES ---------------- */
const UI = {
  card: {
    background: 'linear-gradient(180deg,#131f38 0%,#0e1830 100%)',
    border: '1px solid #24324f',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  },
  cardTitle: {
    fontSize: '13px', fontWeight: 800, color: '#a3b4d7',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  pill: (active, color) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
    fontSize: '14px', fontWeight: 700, transition: 'all .15s ease',
    border: `1px solid ${active ? color : '#2a3550'}`,
    background: active ? `${color}22` : '#0e1730',
    color: active ? color : '#a5b5cc',
  }),
  /* ปุ่มไอคอนในการ์ดเควส — เดิมเป็นไอคอนเปล่า ๆ กับตัว × ขนาด 21px
     ไม่มีพื้นที่กดชัดเจน เล็งยาก และดูไม่เป็นปุ่ม */
  iconBtn: (color) => ({
    width: '27px', height: '27px', borderRadius: '8px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `1px solid ${color}55`, background: `${color}18`, color,
    transition: 'all .15s ease',
  }),
  // ป้ายเล็ก ๆ ท้ายหัวข้อ บอกสถานะได้แม้พับ section ไว้
  badge: (color = '#7c8db0') => ({
    fontSize: '12px', fontWeight: 800, letterSpacing: '.04em',
    padding: '1px 6px', borderRadius: '999px',
    background: `${color}1f`, color, whiteSpace: 'nowrap',
  }),
  chip: (active, color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '999px', cursor: 'pointer', userSelect: 'none',
    fontSize: '13px', fontWeight: 700, transition: 'all .15s ease',
    border: `1px solid ${active ? color : '#2a3550'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#a5b5cc',
  }),
  sectionHead: (open) => ({
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none',
    padding: '10px 12px', borderRadius: open ? '12px 12px 0 0' : '12px',
    background: open ? '#16223c' : '#111c33',
    border: '1px solid #24324f',
    borderBottom: open ? '1px solid #24324f' : '1px solid #24324f',
    fontSize: '13px', fontWeight: 800, color: '#b0c1e1',
    textTransform: 'uppercase', letterSpacing: '.1em',
  }),
  sectionBody: {
    border: '1px solid #24324f', borderTop: 'none', borderRadius: '0 0 12px 12px',
    background: 'linear-gradient(180deg,#101b31 0%,#0d1729 100%)', padding: '12px',
  },
  label: {
    fontSize: '12px', color: '#a5b5cc', textTransform: 'uppercase',
    letterSpacing: '.1em', marginBottom: '6px',
  },
};

/* กล่องหัวข้อพับได้ ใช้หน้าตาเดียวกันทุก section ของ sidebar */
const Section = ({ icon, title, badge, badgeColor, open, onToggle, children }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={UI.sectionHead(open)} onClick={onToggle}>
      <span style={{ fontSize: '15.5px', filter: 'saturate(0.9)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{title}</span>
      {badge != null && <span style={UI.badge(badgeColor)}>{badge}</span>}
      <span style={{ color: '#a5b5cc', display: 'flex' }}>
        {open ? <Icons.ChevronUp size={16} /> : <Icons.ChevronDown size={16} />}
      </span>
    </div>
    {open && <div style={UI.sectionBody}>{children}</div>}
  </div>
);

/* ---------------- COMPONENT ---------------- */
const MapPage = () => {
  const quests = useLiveData(questsStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static
  const mapFeatures = useLiveData(mapFeaturesStatic, 'maps');
  /* ------------------ STATE ที่จำไว้ใน localStorage -----------------------
     usePersisted อ่านค่าตอน init + เขียนกลับเมื่อเปลี่ยน
     ของเดิมเขียน effect เองทุกตัว แล้วใช้ธงกันเขียนทับก่อนโหลดเสร็จ
     ซึ่งไม่จำเป็น เพราะค่าเริ่มต้นก็อ่านจาก localStorage อยู่แล้ว */
  const [selectedQuests, setSelectedQuests] = usePersisted(STORAGE_KEY, []);
  const [checkedObjectives, setCheckedObjectives] = usePersisted(OBJECTIVE_CHECK_KEY, {});
  const [completedQuests, setCompletedQuests] = usePersisted(COMPLETE_KEY, []);
  const [selectedMapId, setSelectedMapId] = usePersisted(MAP_KEY, 1);
  const [hiddenQuests, setHiddenQuest] = usePersisted(HIDDEN_KEY, []);

  /* ------------------ STATE  ----------------------- */
  const [currentQuestId, setCurrentQuestId] = useState(null);
  const [trackedQuests, setTrackedQuests] = useState([]);
  /* ค้นเควสด้วย id เสมอ — มี 9 ชื่อที่ซ้ำกัน (20 เควส) เช่น Drip-Out / Textile
     ที่มีทั้งเวอร์ชัน BEAR และ USEC ชื่อเดียวกัน ถ้าค้นด้วยชื่อจะได้ตัวแรกเสมอ
     ผู้เล่น USEC ก็จะเห็น objective ของฝั่ง BEAR */
  const findQuest = useCallback(
    (tq) => quests.find(q => q.id === tq.id) || quests.find(q => q.name === tq.name),
    [quests]);
  const [expandedQuestName, setExpandedQuestName] = useState(null);
  const [questSearch, setQuestSearch] = useState('');
  const [questKeys, setQuestKeys] = useState([]);
  const [showQuestKey, setShowQuestKey] = useState(false);
  const [showQuestPlant, setShowQuestPlant] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  /* จุดที่กำลังเปิดรายละเอียดอยู่ — ต้องเก็บครบ (เควส, objective, ลำดับจุด)
     ของเดิมเก็บแค่ objective id แล้ววาดป้ายที่จุดท้ายสุดเสมอ (idx === lastIndex)
     objective ที่มีหลายจุดอย่าง Oil Run (รถน้ำมัน 4 คัน) จึงกดคันแรกแล้ว
     รายละเอียดไปโผล่คันท้าย — 158 จาก 539 objective ที่มีพิกัดเป็นแบบนี้ */
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [keyDescription, setKeyDescription] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Toggles for Map Features
  const [showExtracts, setShowExtracts] = useState(true);
  const [showTransits, setShowTransits] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  // faction filter ของ extract (pmc / scav / shared)
  const [extractFactions, setExtractFactions] = useState({ pmc: true, scav: true, shared: true });
  const [showLabels, setShowLabels] = useState(true); // ป้ายชื่อทางออก/transit

  // custom pins (ปักหมุดเอง) — เก็บต่อแผนที่ใน localStorage
  const PINS_KEY = 'eft_map_pins';
  const [pinMode, setPinMode] = useState(false);
  const [customPins, setCustomPins] = usePersisted(PINS_KEY, {});

  // --- Item Tracker (loot spawn) ---
  const ITEMS_KEY = 'eft_tracked_items';
  const allItems = useLiveData(itemsStatic, 'items');       // รายการ item ทั้งหมด (ค้น/meta)
  const [loot, setLoot] = useState(null);                    // { mapId: { itemId: [pos] } }
  const [trackedItems, setTrackedItems] = usePersisted(ITEMS_KEY, []);   // [{id, hidden}]
  useEffect(() => { getData('loot', LOOT_URL).then((d) => d && setLoot(d)).catch(() => {}); }, []);

  // แท็บของไซด์บาร์ — จำไว้ข้ามครั้ง จะได้ไม่ต้องกดกลับมาแท็บเดิมทุกรอบ
  const [tab, setTab] = usePersisted(SECTIONS_KEY, 'quests');
  /* คนที่ค้างอยู่แท็บ Keys ตอนปิดเว็บ จะกลับมาเจอค่า 'keys' ที่ไม่ตรงกับแท็บไหนแล้ว
     -> แถบข้างว่างเปล่าและไม่มีปุ่มไหนถูกเลือก พาไปแท็บแรกแทน */
  useEffect(() => { if (!TAB_KEYS.includes(tab)) setTab('quests'); }, [tab, setTab]);

  // ในแท็บ View ยังพับ Markers/Floors แยกกันได้
  const [openSec, setOpenSec] = useState({ layers: true, floors: true, quests: true });
  const toggleSec = (k) => setOpenSec((s) => ({ ...s, [k]: !s[k] }));


  const [mapCalibrations, setMapCalibrations] = useState(
    maps.reduce((acc, map) => ({
      ...acc,
      [map.id]: {
        scaleX: map.scaleX,
        scaleZ: map.scaleZ,
        offsetX: map.offsetX,
        offsetZ: map.offsetZ,
        flipX: map.flipX,
        flipZ: map.flipZ,
        swapXY: false,
        swapXZ: map.swapXZ
      }
    }), {})
  );

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, gameX: 0, gameZ: 0, rawPercX: 0, rawPercZ: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const viewportRef = useRef(null);   // กรอบที่ตัดขอบแมพ — ใช้คำนวณขอบเขตการลาก

  /* ---------- แมพหลายชั้น (SVG แยก layer ต่อชั้น) ---------- */
  // ต้อง inline SVG ลง DOM ถึงจะเปิด/ปิด <g> ของแต่ละชั้นได้ (<img> ทำไม่ได้)
  const [svgMarkup, setSvgMarkup] = useState(null);
  const svgCache = useRef(new Map());
  const [visibleFloors, setVisibleFloors] = useState([]);
  const [mapStyle, setMapStyle] = useState('abstract');   // 'abstract' = ภาพวาด SVG, 'satellite' = ภาพจริงจากเกม

  /* พื้นที่ของทางออก/transit: ทำแบบ tarkov.dev — ซ่อนไว้ก่อน โผล่เมื่อชี้เมาส์ที่หมุด
     และคลิกเพื่อปักให้ค้าง (ของเขาใช้คลาส not-shown / force-show)
     ข้อดี: ไม่มีกรอบสีเต็มแมพมาบังรายละเอียดตลอดเวลา */
  const [hoverArea, setHoverArea] = useState(null);       // key ของอันที่กำลังชี้
  const [pinnedAreas, setPinnedAreas] = useState(() => new Set());
  const areaKey = (kind, item, idx) => `${kind}:${item.id ?? idx}`;
  const areaShown = (key) => hoverArea === key || pinnedAreas.has(key);
  const toggleArea = (key) => setPinnedAreas(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const currentMap = maps.find(m => m.id === selectedMapId);
  const currentMapName = currentMap?.map_name || "Unknown";
  // แมพ SVG เก็บไว้ที่ public/maps/ เอง (ดึงตอน build ด้วย scripts/update-maps.mjs)
  // ไม่ hotlink assets.tarkov.dev แล้ว -> โหลดเร็วกว่าและไม่พึ่ง CDN คนอื่น
  // The Lab (5) กับ The Labyrinth (10) ต้นทางเป็น tile ไม่ใช่ SVG จึงยังใช้ PNG ของเรา
  const imageSrc = currentMap.id === 5 || currentMap.id === 10
    ? `${import.meta.env.BASE_URL}${currentMap.svg}.png`
    : `${import.meta.env.BASE_URL}maps/${currentMap.svg}.svg`;

  const calib = mapCalibrations[selectedMapId];

  const currentFeatures = useMemo(
    () => mapFeatures.find(m => m.name === currentMapName) || { transits: [], extracts: [], locks: [] },
    [mapFeatures, currentMapName],
  );

  // useMemo สำคัญ: ถ้าสร้าง array ใหม่ทุก render ตัว effect ที่เปิด/ปิดชั้นจะยิงทุกเฟรม
  // ตอนลากแมพ (mousemove -> setState) แล้วเขียน style ทับ <g> ซ้ำ ๆ จนภาพกระพริบ
  const layerEntry = useMemo(() => findMapLayers(currentMap.map_name), [currentMap.map_name]);
  const floors = useMemo(() => usableFloors(layerEntry), [layerEntry]);
  const credit = useMemo(() => mapCredit(layerEntry), [layerEntry]);

  // เริ่มด้วยเปิดทุกชั้น -> พฤติกรรมเหมือนเดิม ไม่มีหมุดหายไปเอง แล้วผู้ใช้ค่อยปิดที่ไม่ต้องการ
  useEffect(() => {
    setVisibleFloors(usableFloors(findMapLayers(currentMap.map_name)).map(f => f.name));
  }, [currentMap.map_name]);

  /* ---------- สไตล์ภาพแมพ: ภาพวาด (abstract) หรือภาพจริงจากเกม (satellite) ---------- */
  const satelliteAvailable = hasSatellite(layerEntry);
  const abstractAvailable = !!layerEntry?.svgFile;
  // แมพที่มีแบบเดียวก็บังคับใช้แบบนั้น (The Lab / Labyrinth มีแต่ satellite,
  // Streets / Lighthouse / Terminal มีแต่ภาพวาด)
  const useSatellite = satelliteAvailable && (mapStyle === 'satellite' || !abstractAvailable);

  useEffect(() => {
    if (!abstractAvailable && satelliteAvailable) setMapStyle('satellite');
    else if (!satelliteAvailable && abstractAvailable) setMapStyle('abstract');
  }, [abstractAvailable, satelliteAvailable]);

  /* อัตราส่วนกรอบแมพ — คิดจากระดับ 0 จึงไม่ขึ้นกับระดับ tile ที่เลือก
     (ถ้าไปผูกกับ tileLevel จะวนกัน: ระดับต้องใช้ขนาดกล่อง กล่องต้องใช้อัตราส่วน) */
  const boxRatio = useMemo(() => {
    const fromBounds = boundsAspect(layerEntry);
    if (fromBounds) return fromBounds;
    if (layerEntry?.viewBox) return layerEntry.viewBox.width / layerEntry.viewBox.height;
    const r = tileRect(layerEntry, 0);
    return r && r.height ? r.width / r.height : null;
  }, [layerEntry]);

  // ตำแหน่งวางภาพ SVG ในกล่อง (Reserve ต้องขยับ/ย่อ เพราะภาพครอบไม่เท่าชุด tile)
  const svgBox = useMemo(() => svgPlacement(layerEntry), [layerEntry]);

  /* ระดับ tile เลือกจากความกว้างที่แสดงจริงบนจอ (กล่องแมพ × zoom)
     ไม่ใช่เดาจากตัวเลข zoom เฉย ๆ -> ความคมเท่าความละเอียดที่ตาเห็นจริง
     boxWidth วัดจาก DOM หลัง render (เก็บใน state เพื่อไม่อ่าน ref ตอน render) */
  const [boxWidth, setBoxWidth] = useState(0);
  useEffect(() => {
    const measure = () => setBoxWidth(imageRef.current?.clientWidth || 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [useSatellite, boxRatio, svgMarkup]);

  const tileLevel = useMemo(
    () => (useSatellite ? pickTileLevel(layerEntry, (boxWidth || 1200) * zoom) : null),
    [useSatellite, layerEntry, boxWidth, zoom],
  );
  const maxLevel = useMemo(
    () => (useSatellite ? maxUsableTileLevel(layerEntry) : null),
    [useSatellite, layerEntry],
  );
  const tiles = useMemo(
    () => (useSatellite && tileLevel != null ? tilesFor(layerEntry, tileLevel, null) : []),
    [useSatellite, layerEntry, tileLevel],
  );

  // โหมด satellite ไม่มี onLoad ของภาพเดียวมาปลด isLoading -> ปลดเองเมื่อมี tile พร้อมวาง
  // (ต้องอยู่หลังประกาศ tileLevel ไม่งั้นชน temporal dead zone ตอน render)
  useEffect(() => {
    if (useSatellite) setIsLoading(false);
  }, [useSatellite, tileLevel]);

  // โหลดตัว SVG เป็นข้อความ (cache ต่อไฟล์ ไม่โหลดซ้ำเวลาสลับแมพไปกลับ)
  useEffect(() => {
    if (!imageSrc.endsWith('.svg')) { setSvgMarkup(null); return undefined; }
    const cached = svgCache.current.get(imageSrc);
    if (cached) { setSvgMarkup(cached); setIsLoading(false); return undefined; }
    let cancelled = false;
    setIsLoading(true);
    fetch(imageSrc)
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(text => {
        if (cancelled) return;
        svgCache.current.set(imageSrc, text);
        setSvgMarkup(text);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('โหลดแมพ SVG ไม่ได้:', err);
        if (!cancelled) { setSvgMarkup(null); setIsLoading(false); }   // fallback ไปใช้ <img>
      });
    return () => { cancelled = true; };
  }, [imageSrc]);

  /* ปิดชั้นด้วย CSS ที่ React คุมเอง ไม่ใช่การเขียน style.display ใส่ DOM หลัง render
     เพราะ innerHTML ของ SVG ถูกสร้างใหม่ได้ทุกเมื่อ (re-render / สลับแมพ) แล้วค่าที่เขียนไว้จะหลุด
     -> ชั้นที่ปิดไว้กลับมาโชว์เองเวลาขยับเมาส์ ซึ่งเป็นบั๊กที่เจอ
     วิธีนี้เป็น declarative: DOM ถูกสร้างใหม่กี่ครั้ง กฎก็ยังบังคับอยู่ */
  const hiddenFloorCss = useMemo(() => floors
    .filter(f => !visibleFloors.includes(f.name))
    .map(f => `.eft-map-svg [id="${f.svgLayer}"]{display:none}`)
    .join(''), [floors, visibleFloors]);

  // ซ่อนหมุดที่อยู่บนชั้นที่ปิดไว้ (ใช้ position.y + กรอบอาคารของชั้น)
  const visibleFeatures = useMemo(() => {
    const show = (pos) => isMarkerVisible(layerEntry, visibleFloors, pos);
    return {
      extracts: (currentFeatures.extracts || []).filter(e => show(e.position)),
      transits: (currentFeatures.transits || []).filter(t => show(t.position)),
      locks: (currentFeatures.locks || []).filter(l => show(l.position)),
    };
  }, [currentFeatures, layerEntry, visibleFloors]);
  /* ซิงก์เมื่อแท็บอื่นแก้ข้อมูล (หรือหน้าอื่นยิง event 'storage' เอง เช่นตอนกด Reset)
     callbackStorageChange คืนฟังก์ชันถอด listener มาให้ — ของเดิมไม่ได้ return
     ออกจาก effect ทำให้ listener ค้างสะสมทุกครั้งที่เข้าหน้านี้ */
  useEffect(() => QuestComponent.callbackStorageChange(() => {
    setSelectedQuests(readStored(STORAGE_KEY, []));
    setCheckedObjectives(readStored(OBJECTIVE_CHECK_KEY, {}));
    setCompletedQuests(readStored(COMPLETE_KEY, []));
    setHiddenQuest(readStored(HIDDEN_KEY, []));
    setTrackedQuests([]);
    // setter จาก usePersisted เสถียรเหมือน useState แต่ eslint มองไม่เห็นผ่าน custom hook
  }), [setSelectedQuests, setCheckedObjectives, setCompletedQuests, setHiddenQuest]);

  // เปลี่ยนแมพแล้วรีเซ็ตมุมมองกลับไปตั้งต้น
  useEffect(() => {
    setIsLoading(true);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    /* ล้างคำค้นด้วย — รายการ track ถูกล้างไปพร้อมกัน ถ้าปล่อยคำค้นค้างไว้
       แมพใหม่จะขึ้นเป็นรายการว่างโดยไม่มีอะไรบอกว่าเพราะยังกรองอยู่ */
    setQuestSearch('');
  }, [selectedMapId]);

  useEffect(() => {
    const questsToAdd = [];

    selectedQuests.forEach(quest => {
      const matchMap = quest.objectives.some(obj =>
        obj.maps?.some(
          m =>
            m.name === currentMapName ||
            m.name === `${currentMapName} 21+`
        )
      );

      if (matchMap) {
        // Push directly to array
        questsToAdd.push({ id: quest.id, name: quest.name });
      }
    });

    // 2. Check length on the array
    if (questsToAdd.length === 0) return;

    setTrackedQuests(prev => {
      // Create a Set of existing IDs (better than names for uniqueness)
      const existingIds = new Set(prev.map(q => q.id));
      const usedColors = prev.map(q => q.color);

      const newItems = questsToAdd
        // 3. Filter using the array we created
        .filter(q => !existingIds.has(q.id))
        .map(q => ({
          ...q, // 4. SPREAD the quest properties (id, name) so it's not nested
          color: getRandomColor(usedColors),
          visible: !hiddenQuests.includes(q.id) // Simplified boolean logic
        }));

      // If all items were duplicates, return prev to avoid unnecessary re-render
      if (newItems.length === 0) return prev;

      return [...prev, ...newItems];
    });
    /* ต้องมี hiddenQuests ด้วย — บรรทัดที่คำนวณ visible อ่านค่านี้
       ถ้าไม่ใส่ จะใช้ค่าค้างจากรอบก่อน ทำให้เควสที่เพิ่งซ่อนกลับมาแสดงเอง
       ตอนสลับแมพหรือเพิ่มเควสใหม่ (effect นี้คืน prev ถ้าไม่มีอะไรเพิ่ม จึงรันซ้ำได้ปลอดภัย) */
  }, [selectedQuests, currentMapName, hiddenQuests]);
  // ----------- END on START -----------


  /* เควสที่ปลดล็อกต่อจากเควสที่เพิ่งทำเสร็จ
     (การเขียน localStorage ย้ายไปอยู่ใน usePersisted แล้ว เหลือแค่ตรรกะนี้) */
  useEffect(() => {
    if (!currentQuestId) return;
    const nextQuestList = QuestComponent.getNextQuestLists(completedQuests, currentQuestId);
    if (!nextQuestList.length) return;
    setSelectedQuests(prev => {
      const byId = new Map(prev.map(q => [q.id, q]));
      nextQuestList.forEach(q => byId.set(q.id, q));
      return Array.from(byId.values());
    });
  }, [completedQuests, currentQuestId, setSelectedQuests]);
  /* รายการกุญแจรวมของแมพที่เปิดอยู่ = "ต้องพกอะไรลงเรดนี้บ้าง"
     ยุบตาม id — ของเดิมดันแถวต่อคู่ (เควส, กุญแจ) กุญแจดอกเดียวที่ 3 เควสใช้
     เลยโผล่ 3 แถว ตอนนี้เหลือแถวเดียวแล้วไล่ชื่อเควสไว้ข้างใต้แทน */
  useEffect(() => {
    const byKey = new Map();
    trackedQuests.forEach((tq) => {
      const fullQuest = findQuest(tq);
      if (!fullQuest) return;
      QuestComponent.questKeys(fullQuest, currentMapName).forEach((k) => {
        const row = byKey.get(k.id) || { ...k, quests: [] };
        if (!row.quests.includes(tq.name)) row.quests.push(tq.name);
        byKey.set(k.id, row);
      });
    });
    setQuestKeys([...byKey.values()]);
  }, [trackedQuests, currentMapName, findQuest]);

  /* ของที่ต้องพกไปวาง/มาร์ก/ใช้ บนแมพนี้ — รวมแบบเดียวกับกุญแจ
     (MS2000 Marker ใช้กับหลายเควสพร้อมกันบ่อย เลยต้องบอกว่าของใครบ้างเหมือนกัน) */
  const [questPlants, setQuestPlants] = useState([]);
  useEffect(() => {
    const byItem = new Map();
    trackedQuests.forEach((tq) => {
      const fullQuest = findQuest(tq);
      if (!fullQuest) return;
      QuestComponent.questPlantItems(fullQuest, currentMapName).forEach((it) => {
        const row = byItem.get(it.id) || { ...it, quests: [] };
        row.count = Math.max(row.count, it.count);
        if (!row.quests.includes(tq.name)) row.quests.push(tq.name);
        byItem.set(it.id, row);
      });
    });
    setQuestPlants([...byItem.values()]);
  }, [trackedQuests, currentMapName, findQuest]);

  // HELPER FUNCTIONS
  const updateCalib = (newVals) => {
    setMapCalibrations(prev => ({
      ...prev,
      [selectedMapId]: { ...prev[selectedMapId], ...newVals }
    }));
  };

  const gameToPerc = (val, offset, scale, flip) => {
    const direction = flip ? -1 : 1;
    return offset + (val * scale * direction);
  };

  // สี + ไอคอนตาม faction ของ extract
  // สีชุดเดียวกับ tarkov.dev/map (pmc เขียวมิ้นต์ / scav ส้ม / shared ฟ้าอมเขียว)
  const FACTION_COLORS = { pmc: '#00e599', scav: '#ff7800', shared: '#00e4e5' };
  const factionColor = (f) => FACTION_COLORS[f] || FACTION_COLORS.scav;
  const factionImg = (f) => `https://tarkov.dev/maps/interactive/extract_${f === 'pmc' ? 'pmc' : f === 'shared' ? 'shared' : 'scav'}.png`;

  /* แปลง game position -> % บนภาพ
     ใช้ bounds ที่ต้นทางเผยแพร่ (แม่นและไม่ต้องจูนมือ) ถ้าแมพนั้นมีข้อมูล
     ไม่งั้นถอยไปใช้ค่า calibrate เดิม — ค่าเดิมเพี้ยนกับแมพที่เปลี่ยนภาพฐาน
     อย่าง The Lab (ต่าง 7.3%) และ The Labyrinth (3.1%) เพราะจูนไว้กับ PNG ชุดเก่า */
  const useBoundsCoords = canPlaceByBounds(layerEntry);
  // useCallback เพื่อให้ useMemo ที่ใช้ฟังก์ชันนี้ใส่ไว้ใน deps ได้
  // (ถ้าเป็นฟังก์ชันธรรมดาจะถูกสร้างใหม่ทุก render แล้ว memo จะไม่เหลือประโยชน์)
  const posToPerc = useCallback((pos) => {
    if (useBoundsCoords) return posToPercent(layerEntry, pos);
    let fx = pos.x, fv = pos.z;
    if (calib.swapXZ) { const t = fx; fx = fv; fv = t; }
    return {
      x: gameToPerc(fx, calib.offsetX, calib.scaleX, calib.flipX),
      y: gameToPerc(fv, calib.offsetZ, calib.scaleZ, calib.flipZ),
    };
  }, [useBoundsCoords, layerEntry, calib]);

  // % ของจุดที่คลิกเทียบกับภาพ (เหมือน handleMouseMove)
  const pctFromEvent = (e) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };


  const pinsHere = customPins[currentMapName] || [];

  // --- Item Tracker: map ปัจจุบัน -> tarkov id, สีต่อ item, หมุด loot ---
  const tarkovMapId = React.useMemo(
    () => (mapFeatures || []).find((m) => m.name === currentMapName)?.id || null,
    [mapFeatures, currentMapName]
  );
  const colorForItem = (id) => `hsl(${([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) * 47) % 360}, 85%, 60%)`;
  const trackedNames = React.useMemo(() => {
    const byId = new Map((allItems || []).map((x) => [x.id, x.name]));
    return Object.fromEntries(trackedItems.map((t) => [t.id, byId.get(t.id) || t.id]));
  }, [allItems, trackedItems]);
  const itemPinsHere = React.useMemo(() => {
    if (!loot || !tarkovMapId) return [];
    const mapLoot = loot[tarkovMapId] || {};
    const out = [];
    for (const t of trackedItems) {
      if (t.hidden) continue;
      for (let i = 0; i < (mapLoot[t.id] || []).length; i++) {
        const p = posToPerc(mapLoot[t.id][i]);
        out.push({ key: `${t.id}-${i}`, x: p.x, y: p.y, color: colorForItem(t.id), name: trackedNames[t.id], expanded: !!t.expanded });
      }
    }
    return out;
  }, [loot, tarkovMapId, trackedItems, trackedNames, posToPerc]);   // calib อยู่ใน posToPerc แล้ว
  // ไม่ต้องเขียน localStorage เองแล้ว — usePersisted(PINS_KEY) ทำให้ตอนค่าเปลี่ยน
  const addPin = (xPerc, yPerc) => {
    const label = (typeof window !== 'undefined' && window.prompt('Pin label (optional):', '')) || '';
    setCustomPins(prev => ({
      ...prev,
      [currentMapName]: [...(prev[currentMapName] || []), { id: Date.now(), x: xPerc, y: yPerc, label }],
    }));
  };
  const removePin = (id) => {
    setCustomPins(prev => ({
      ...prev,
      [currentMapName]: (prev[currentMapName] || []).filter(p => p.id !== id),
    }));
  };

  /**
   * จำกัดระยะเลื่อนไม่ให้ลากแมพออกไปพ้นจอจนกลับมาหาไม่เจอ
   * เหลือให้แมพค้างในจออย่างน้อย ~25% ของด้านที่สั้นกว่าเสมอ
   */
  const clampOffset = useCallback((next, zoomValue, viewport) => {
    const el = imageRef.current;
    if (!el || !viewport) return next;
    const limit = (contentSize, viewSize) => {
      const scaled = contentSize * zoomValue;
      const keep = Math.min(viewSize, scaled) * 0.25;
      return Math.max(0, (scaled + viewSize) / 2 - keep);
    };
    const lx = limit(el.clientWidth, viewport.width);
    const ly = limit(el.clientHeight, viewport.height);
    return {
      x: Math.max(-lx, Math.min(lx, next.x)),
      y: Math.max(-ly, Math.min(ly, next.y)),
    };
  }, []);

  /* ลากแมพ: ผูก mousemove/mouseup ไว้ที่ window ไม่ใช่ที่ตัว div
     ของเดิมผูกไว้กับ div ของแมพ พอลากแล้วเมาส์วิ่งออกไปโดนแถบข้าง ป้ายหมุด
     หรือการ์ดต่าง ๆ มันก็หยุดส่ง mousemove -> แมพสะดุด และถ้าปล่อยเมาส์
     นอกหน้าต่างไปเลยก็ไม่มี mouseup มาปิด แมพเลยค้างในโหมดลาก

     ระหว่างลากปิด user-select ทั้งหน้าด้วย — ไม่งั้นลากผ่านอะไรก็คลุมดำไปหมด */
  useEffect(() => {
    if (!isDragging) return undefined;
    const move = (e) => {
      const el = viewportRef.current;
      if (!el) return;
      setOffset(clampOffset(
        { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y },
        zoom,
        el.getBoundingClientRect(),
      ));
    };
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.userSelect = prevSelect;
    };
  }, [isDragging, dragStart, zoom, clampOffset]);

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    // ตอนลากแมพ ข้ามการอัปเดตตัวอ่านพิกัดใต้เมาส์ -> setState น้อยลงครึ่งหนึ่งต่อเฟรม
    // (ค่าพิกัดไม่มีประโยชน์ระหว่างลาก และการ re-render ถี่ ๆ ทำให้ SVG ที่ inline ไว้กระตุก)
    // ตัวการลากเองย้ายไปอยู่ที่ listener บน window ด้านบนแล้ว
    if (isDragging) return;
    const rect = imageRef.current.getBoundingClientRect();

    // Exact percentage of the mouse over the image
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const pz = ((e.clientY - rect.top) / rect.height) * 100;

    // ตัวอ่านพิกัดใต้เมาส์ ใช้สูตรผกผันของตัววางหมุด จะได้ตรงกันเสมอ
    let gx;
    let gz;
    if (useBoundsCoords) {
      const g = percentToPos(layerEntry, px, pz);
      gx = g.x;
      gz = g.z;
    } else {
      gx = (px - calib.offsetX) / (calib.scaleX * (calib.flipX ? -1 : 1));
      gz = (pz - calib.offsetZ) / (calib.scaleZ * (calib.flipZ ? -1 : 1));
      if (calib.swapXZ) [gx, gz] = [gz, gx];
    }

    setMousePos({
      x: px.toFixed(2),
      z: pz.toFixed(2),
      gameX: gx.toFixed(2),
      gameZ: gz.toFixed(2),
      rawPercX: px,
      rawPercZ: pz
    });
  };

  const toggleQuestVisibility = (e, questId) => {
    e.stopPropagation();

    // 1. Update the UI (Visual Toggle)
    setTrackedQuests(prev => prev.map(q =>
      q.id === questId ? { ...q, visible: !q.visible } : q
    ));

    // 2. Update the Hidden List (Storage/Logic)
    setHiddenQuest(prev => {
      if (prev.includes(questId)) {
        // If currently hidden, REMOVE from list (Make Visible)
        return prev.filter(id => id !== questId);
      } else {
        // If currently visible, ADD to list (Make Hidden)
        return [...prev, questId];
      }
    });
  };

  const resetZoom = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const rotateMap = (angle) => {
    setRotation(prev => prev + angle);
  };

  const markerScale = 1 / zoom;

  /* พิกัดทุกจุดของ objective หนึ่งบนแมพที่เปิดอยู่ — ใช้ร่วมกันระหว่างตอนวาดหมุด
     กับตอนนับ "จุดที่ 2 จาก 4" ในแถบรายละเอียด จะได้ไม่มีทางนับคนละชุดกัน */
  const objectivePoints = useCallback((obj) => {
    const onMap = obj.maps?.some(m => m.name === currentMapName || m.name === `${currentMapName} 21+`);
    if (!onMap) return [];
    const out = [];
    obj.zones?.forEach(z => out.push(z.position));
    obj.possibleLocations?.forEach(loc => loc.positions.forEach(p => out.push(p)));
    return out;
  }, [currentMapName]);

  /* แปลง selectedPoint กลับเป็นของจริงตอน render — ถ้าเควสถูกเอาออก/ซ่อน
     สลับแมพ หรือกด Done ไปแล้ว ตัวนี้จะคืน null เอง แถบล่างเลยหายตามไปด้วย
     โดยไม่ต้องมี effect คอยล้าง state */
  const pointDetail = useMemo(() => {
    if (!selectedPoint) return null;
    const tq = trackedQuests.find(q => q.id === selectedPoint.questId);
    if (!tq?.visible) return null;
    const quest = findQuest(tq);
    const obj = quest?.objectives?.find(o => o.id === selectedPoint.objId);
    if (!obj) return null;
    if (checkedObjectives[getObjectiveKey(quest.id, obj.id)]) return null;
    const total = objectivePoints(obj).length;
    if (selectedPoint.idx >= total) return null;
    return { tq, quest, obj, total, idx: selectedPoint.idx };
  }, [selectedPoint, trackedQuests, findQuest, checkedObjectives, objectivePoints]);

  /* ค้นหาในรายการที่ track อยู่ — กรองเฉพาะสิ่งที่เห็นในแผง ไม่แตะหมุดบนแมพ
     บน Customs/Shoreline มีเควสลงแมพได้ถึง 80 เควส = เลื่อนราว 10 หน้าจอ
     ค้นจากชื่อเควส ชื่อเทรดเดอร์ และข้อความเป้าหมาย — ชื่อเควสอย่างเดียวไม่พอ
     เพราะหลายอันจำได้แต่ว่า "ต้องไปวางอะไรสักอย่างที่ปั๊ม" ไม่ได้จำชื่อ */
  const shownQuests = useMemo(() => {
    if (!questSearch.trim()) return trackedQuests;
    return trackedQuests.filter((tq) =>
      QuestComponent.questMatchesSearch(findQuest(tq) || { name: tq.name }, questSearch));
  }, [trackedQuests, questSearch, findQuest]);

  // ----------- QUEST ACTIONS -----------
  const removeQuest = (e, questId) => {
    e.stopPropagation();

    // อ่านค่าเดิมผ่าน prev เสมอ ไม่ใช้ตัวแปรจาก closure ของ render
    setTrackedQuests(prev => prev.filter(q => q.id !== questId));
    setSelectedQuests(prev => prev.filter(q => q.id !== questId));
    clearObjectiveProgress(questId);
    if (expandedQuestName === questId) setExpandedQuestName(null);
  };

  const clearObjectiveProgress = (questId) => {
    setCheckedObjectives((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((key) => {
        if (key.startsWith(`${questId}|`)) {
          delete updated[key];
        }
      });

      return updated;
    });
  };

  const completeMark = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setCheckedObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const nextQuest = (e, questId) => {
    e?.stopPropagation();
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    const newCompleted = QuestComponent.getPreviousQuestsList(quest.id, completedQuests);

    /* ต้องเก็บเป็น id ไม่ใช่ชื่อ — getPreviousQuestsList คืน { id, status } ซึ่งไม่มีฟิลด์ name
       (u.name จึงเป็น undefined ทุกตัว) และ removeQuest ก็รับ id ตั้งแต่ตอนแก้บั๊กชื่อซ้ำ
       ผลคือกด Complete แล้วเควสไม่หายไปจากรายการ */
    const idsToRemove = new Set(newCompleted.map(u => u.id));
    idsToRemove.add(quest.id);

    /* อัปเดตทีเดียวจบ ไม่วนเรียก removeQuest ทีละตัว — removeQuest อ่าน trackedQuests
       จาก closure ของ render ปัจจุบัน วนเรียกหลายรอบจึงเริ่มจากค่าเดิมทุกครั้ง
       สุดท้ายเหลือผลของรอบท้ายสุดรอบเดียว */
    setTrackedQuests(prev => prev.filter(q => !idsToRemove.has(q.id)));
    setSelectedQuests(prev => prev.filter(q => !idsToRemove.has(q.id)));
    idsToRemove.forEach(id => clearObjectiveProgress(id));
    if (idsToRemove.has(expandedQuestName)) setExpandedQuestName(null);

    setCurrentQuestId(quest.id);
    setCompletedQuests(prev => {
      const byId = new Map(prev.map(q => [q.id, q]));
      newCompleted.forEach(q => byId.set(q.id, q));
      return Array.from(byId.values());
    });
  }

  // ไม่มี onMouseUp ที่กรอบนอกแล้ว — listener บน window จบการลากให้ทุกกรณี
  // รวมถึงตอนปล่อยเมาส์นอกหน้าต่าง ซึ่งของเดิมจับไม่ได้ แมพเลยค้างในโหมดลาก
  return (
    <div style={styles.container}>
      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          style={styles.toggleButton}
          onClick={() => setIsSidebarOpen(true)}
          title="Open Sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}

      <aside style={{
        ...styles.sidebar,
        width: isSidebarOpen ? '330px' : '0px',
        minWidth: isSidebarOpen ? '330px' : '0px',
        padding: 0,
        gap: 0,
        opacity: isSidebarOpen ? 1 : 0,
        overflow: 'hidden',
      }}>
        {/* ---- ส่วนหัวติดอยู่กับที่: ของที่ใช้บ่อยสุด (เลือกแมพ / สไตล์ภาพ) ---- */}
        {/* ไม่มี borderBottom — แถบแท็บที่ต่อท้ายมีเส้นคั่นอยู่แล้ว ใส่ทั้งคู่จะเป็นเส้นซ้อนสองชั้น */}
        <div style={{
          padding: '14px 14px 12px',
          background: '#0d1526', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <span style={{ width: '3px', height: '20px', borderRadius: '3px', background: 'linear-gradient(#eab308,#f59e0b)' }} />
              <h1 style={{ fontSize: '17.5px', fontWeight: 800, margin: 0, letterSpacing: '.02em' }}>Quest Map</h1>
            </header>
            <button
              style={{ background: '#0e1730', border: '1px solid #24324f', borderRadius: '8px', color: '#a6b5ca', cursor: 'pointer', padding: '3px 5px', display: 'flex' }}
              onClick={() => setIsSidebarOpen(false)}
              title="Hide panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          </div>

          {/* ช่องเลือกแมพ — มีป้ายหัวช่องกำกับ ไม่ใช่กล่องลอย ๆ ที่ต้องเดาว่าคืออะไร */}
          <label style={{ ...styles.fieldLabel, marginTop: '10px' }} htmlFor="eft-map-select">Map</label>
          <select
            id="eft-map-select"
            style={{ ...styles.select, marginBottom: satelliteAvailable && abstractAvailable ? '10px' : 0 }}
            value={selectedMapId}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#2a3a5c'; }}
            onChange={(e) => {
              setSelectedMapId(Number(e.target.value));   // usePersisted บันทึกให้เอง
              setTrackedQuests([]);
              setExpandedQuestName(null);
            }}
          >
            {maps.map(map => <option key={map.id} value={map.id}>{map.map_name}</option>)}
          </select>

          {/* สลับสไตล์ภาพ — อยู่ระดับบนสุดเพราะเปลี่ยนบ่อยและเห็นผลทันที */}
          {satelliteAvailable && abstractAvailable && (
            <div style={{ display: 'flex', gap: '4px', background: '#0b1120', padding: '3px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              {[
                { key: 'abstract', label: 'Abstract', hint: 'Vector map — sharp at any zoom, easier to read' },
                { key: 'satellite', label: 'Satellite', hint: 'Real in-game imagery — streamed as tiles' },
              ].map(s => {
                const on = mapStyle === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setMapStyle(s.key)}
                    title={s.hint}
                    style={{
                      flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 700,
                      border: 'none', transition: 'all .15s ease',
                      /* เดิมตัวที่เลือกเป็นฟ้าทึบตัวหนังสือดำ ซึ่งดังกว่าทุกอย่างในแผง
                         ทั้งที่เป็นแค่สวิตช์ — เปลี่ยนเป็นพื้นจาง ๆ ตัวหนังสือสี */
                      background: on ? 'rgba(56,189,248,.16)' : 'transparent',
                      color: on ? '#38bdf8' : '#7c8db0',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- แท็บ ----
             ของเดิมเป็นสกรอลยาวอันเดียว กางเควสทีก็ดัน Keys ลงไปจนต้องเลื่อนหา
             แยกเป็นแท็บแล้วแต่ละอันเต็มแผง กดแล้วเจอเลย

             ใช้แบบขีดเส้นใต้ ไม่ใช่ปุ่มกล่องมีขอบ — ปุ่มกล่องทำให้มีเส้นกรอบซ้อนกับ
             เส้นคั่นของหัวแผงจนดูหนัก และไม่ใส่อิโมจิเพราะไซด์บาร์ 330px
             หาร 4 ได้ช่องละ ~72px ใส่ไอคอนแล้วตัวหนังสือโดนบีบ */}
        <div style={{
          display: 'flex', gap: '2px', padding: '0 10px',
          borderBottom: '1px solid #1e293b', flexShrink: 0, background: '#0d1526',
        }}>
          {[
            // Keys ยุบไปอยู่บนสุดของแท็บ Quests แล้ว — เหลือ 3 ช่อง กว้างขึ้นจาก ~72px เป็น ~96px
            { k: 'quests', label: 'Quests', n: trackedQuests.length, color: '#3bc0fb' },
            { k: 'items', label: 'Items', n: trackedItems.length, color: '#c1a5ff' },
            { k: 'view', label: 'View', n: 0, color: '#23cc94' },
          ].map((t) => {
            const on = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                title={t.label}
                style={{
                  flex: 1, minWidth: 0, position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '11px 2px 10px', border: 'none', background: 'transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: '13.5px', fontWeight: 800,
                  color: on ? t.color : '#a4b4d5',
                  transition: 'color .15s ease',
                }}
              >
                <span>{t.label}</span>
                {t.n > 0 && (
                  <span style={{
                    fontSize: '12px', fontWeight: 800,
                    color: on ? t.color : '#a5b5cc',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{t.n}</span>
                )}
                {/* ขีดใต้แท็บที่เลือก วางทับเส้นคั่นพอดี */}
                {on && (
                  <span style={{
                    position: 'absolute', left: '8px', right: '8px', bottom: '-1px',
                    height: '2px', borderRadius: '2px', background: t.color,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* minHeight:0 จำเป็น — flex item ตั้งต้นเป็น min-height:auto จะไม่ยอมหด
            ต่ำกว่าความสูงเนื้อหา ทำให้ overflowY:auto ไม่ทำงานและเลื่อนไม่ได้ */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px 4px' }}>
        {tab === 'quests' && (<>
        {/* ---- สิ่งที่ดูระหว่างเล่น ---- */}

        {/* กุญแจรวมของแมพนี้ อยู่บนสุดเพราะเป็นของที่เช็คก่อนลงเรด
            เดิมแยกเป็นแท็บของตัวเอง แต่ว่างเกือบตลอด (ทั้งเกมมีแค่ 56 จาก 503 เควส
            ที่ใช้กุญแจ และนับเฉพาะเควสที่ track บนแมพนี้อีกที) */}
        {questKeys.length > 0 && (
          <Section
            icon="🔑" title="Keys needed" badge={questKeys.length} badgeColor="#eab308"
            open={showQuestKey} onToggle={() => setShowQuestKey(!showQuestKey)}
          >
            {(
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {questKeys.map((k) => (
                  <div key={k.id}>
                    <KeyChip item={k} />
                    {/* กุญแจดอกเดียวอาจใช้ได้หลายเควส — บอกว่าของใครบ้าง */}
                    <div style={{ fontSize: '12.5px', color: '#a5b5cc', marginTop: '3px', lineHeight: 1.35 }}>
                      {k.quests.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ของที่ต้องพกไปวาง — เช็คก่อนลงเรดเหมือนกุญแจ ลืมแล้วเสียเที่ยวเท่ากัน */}
        {questPlants.length > 0 && (
          <Section
            icon="📦" title="Bring to place" badge={questPlants.length} badgeColor="#eab308"
            open={showQuestPlant} onToggle={() => setShowQuestPlant(!showQuestPlant)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {questPlants.map((it) => (
                <div key={it.id}>
                  <KeyChip item={it} note={placeNote({ ...it, mapName: null })} />
                  <div style={{ fontSize: '12.5px', color: '#a5b5cc', marginTop: '3px', lineHeight: 1.35 }}>
                    {it.quests.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section
          icon="🎯" title="Tracked quests" badge={trackedQuests.length || 'none'}
          badgeColor={trackedQuests.length ? '#38bdf8' : '#64748b'}
          open={openSec.quests} onToggle={() => toggleSec('quests')}
        >
          {(<>
          {trackedQuests.length === 0 && (
            <div style={{ fontSize: '14px', color: '#a5b5cc', textAlign: 'center', padding: '12px 0' }}>
              No quests tracked yet
            </div>
          )}

          {/* ช่องค้นหา — sticky ไว้บนสุดของกล่องที่เลื่อน จะได้พิมพ์แก้คำค้นได้
              โดยไม่ต้องเลื่อนกลับขึ้นมา · margin ติดลบเพื่อกินขอบ padding ของ section
              ให้พื้นหลังคลุมเต็มความกว้าง ไม่งั้นการ์ดจะไหลลอดข้าง ๆ ตอนเลื่อน */}
          {trackedQuests.length > 0 && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 5,
              margin: '-12px -12px 0', padding: '12px 12px 10px',
              background: '#101b31', borderBottom: '1px solid #24324f',
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 10, fontSize: '13px', pointerEvents: 'none' }}>🔍</span>
                <input
                  value={questSearch}
                  onChange={(e) => setQuestSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setQuestSearch(''); }}
                  placeholder="Search name, trader, objective"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 30px 8px 31px',
                    borderRadius: '9px', border: '1px solid #2a3550',
                    background: '#0b1324', color: '#f1f7ff',
                    fontSize: '14px', outline: 'none',
                  }}
                />
                {questSearch && (
                  <button
                    onClick={() => setQuestSearch('')}
                    title="Clear"
                    style={{
                      position: 'absolute', right: 6,
                      width: '22px', height: '22px', borderRadius: '6px',
                      border: 'none', background: 'transparent', color: '#cbdcfc',
                      fontSize: '13px', fontWeight: 800, lineHeight: 1, cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {questSearch.trim() && (
                <div style={{ marginTop: '7px', fontSize: '12.5px', color: '#a5b5cc' }}>
                  showing {shownQuests.length} of {trackedQuests.length}
                </div>
              )}
            </div>
          )}

          {/* กรองแล้วไม่เหลืออะไร ต้องบอกว่าเพราะคำค้น ไม่ใช่เพราะไม่มีเควสบนแมพนี้ */}
          {trackedQuests.length > 0 && shownQuests.length === 0 && (
            <div style={{ fontSize: '14px', color: '#a5b5cc', textAlign: 'center', padding: '18px 0 6px' }}>
              No quest matches “{questSearch.trim()}”
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
            {shownQuests.map((tq) => {
              const fullQuest = findQuest(tq);
              const isExpanded = expandedQuestName === tq.id;

              return (
                <div
                  key={tq.name}
                  style={{
                    ...styles.questCard,
                    borderColor: isExpanded ? tq.color : '#334155',
                    borderWidth: isExpanded ? '2px' : '1px',
                    opacity: tq.visible ? 1 : 0.6
                  }}
                  onClick={() => setExpandedQuestName(isExpanded ? null : tq.id)}
                >
                  {/* แถบสีเทรดเดอร์ชิดซ้าย แทนจุดกลมเล็ก ๆ — กวาดตาหาเควสของเทรดเดอร์
                      คนเดียวกันได้เร็วกว่า และยังบอกสถานะซ่อน/แสดงด้วยความทึบ */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
                    <span style={{
                      width: '4px', alignSelf: 'stretch', minHeight: '34px', borderRadius: '2px', flexShrink: 0,
                      background: tq.visible ? tq.color : '#475569',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '15.5px', fontWeight: 700, lineHeight: 1.3,
                        color: tq.visible ? '#f8fafc' : '#94a3b8',
                      }}>
                        {tq.name}
                      </div>
                      {/* ป้ายทั้งแถวใช้สไตล์เดียวกัน — ของเดิมผสม badge ของ bootstrap
                          (เขียว/ฟ้าทึบ ฟอนต์คนละตัว) กับข้อความเปล่า เลยดูคนละชุด */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                        <span style={UI.badge(TRADER_THEMES[fullQuest.trader?.name]?.bg || '#64748b')}>
                          {fullQuest.trader?.name}
                        </span>
                        {fullQuest.minPlayerLevel > 1 && (
                          <span style={UI.badge('#64748b')}>LV {fullQuest.minPlayerLevel}</span>
                        )}
                        {fullQuest.kappaRequired && <span style={UI.badge('#eab308')}>Kappa</span>}
                        {fullQuest.lightkeeperRequired && <span style={UI.badge('#38bdf8')}>Lightkeeper</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => toggleQuestVisibility(e, tq.id)}
                        style={UI.iconBtn(tq.visible ? '#38bdf8' : '#64748b')}
                        title={tq.visible ? "Hide markers" : "Show markers"}
                      >
                        {tq.visible ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => removeQuest(e, tq.id)}
                        style={UI.iconBtn('#ef4444')}
                        title="Remove from list"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a3a5c', fontSize: '14px' }}>
                      {/* เดิมเป็นเขียวสด #00c40a ตัวหนังสือขาว ซึ่งดังกว่าทุกอย่างในแผง
                          และตั้ง cursor: default ไว้ด้วย เลยไม่เหมือนปุ่มที่กดได้ */}
                      <button
                        style={{
                          width: '100%', padding: '9px', borderRadius: '9px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          border: '1px solid #22c55e', background: 'rgba(34,197,94,.16)', color: '#6ee7a8',
                          fontSize: '15px', fontWeight: 800, letterSpacing: '.03em',
                          transition: 'all .15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,.28)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,.16)'; }}
                        onClick={(e) => nextQuest(e, tq.id)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Complete
                      </button>
                      {/* กุญแจที่เควสนี้ต้องใช้ — เอาทุกแมพ ไม่ใช่แค่แมพที่เปิดอยู่
                          จะได้รู้ตั้งแต่ตอนวางแผนว่าต้องหาดอกไหนเพิ่ม */}
                      {(() => {
                        const keys = QuestComponent.questKeys(fullQuest);
                        if (keys.length === 0) return null;
                        return (
                          <>
                            <div style={{ ...styles.fieldLabel, margin: '13px 0 7px' }}>Keys needed</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                              {keys.map((k) => <KeyChip key={k.id} item={k} showMap />)}
                            </div>
                          </>
                        );
                      })()}
                      <div style={{ ...styles.fieldLabel, margin: '13px 0 7px' }}>Objectives</div>
                      {fullQuest.objectives.map((obj, idx) => {
                        const ticked = !!checkedObjectives[getObjectiveKey(fullQuest.id, obj.id)];
                        return (
                          /* ติ๊กแล้วบอกด้วยสี + ขีดฆ่า แทนการต่อท้ายด้วยอิโมจิ ✅
                             ซึ่งกวาดตาแล้วแยกยากเวลามี objective หลายอัน */
                          <div key={idx} style={{
                            display: 'flex', gap: '7px', marginBottom: '7px', lineHeight: 1.45,
                            color: ticked ? '#4b5a74' : '#cbd5e1',
                            textDecoration: ticked ? 'line-through' : 'none',
                          }}>
                            <span style={{ flexShrink: 0, color: ticked ? '#22c55e' : '#475569' }}>
                              {ticked ? '✓' : '•'}
                            </span>
                            <span>
                              {obj.description}
                              {["giveItem", "TaskObjectiveShoot", "shoot", "kill"].includes(obj.type) && (
                                <span style={{ color: ticked ? '#4b5a74' : '#38bdf8', fontWeight: 700 }}> ×{obj.count}</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                      <div style={{
                        marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1e293b',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={UI.badge('#10b981')}>+{(fullQuest.experience || 0).toLocaleString()} XP</span>
                        <a
                          href={fullQuest.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#74b9ff', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Wiki ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>)}
        </Section>
        </>)}

        {tab === 'items' && (<>
        {/* Item Tracker (loot spawn) */}
        <ItemTracker
          items={allItems}
          loot={loot}
          mapId={tarkovMapId}
          mapName={currentMapName}
          tracked={trackedItems}
          colorFor={colorForItem}
          onChange={setTrackedItems}
        />
        </>)}

        {tab === 'view' && (<>
        {/* ---- ตัวตั้งค่าการแสดงผล ---- */}
        {/* ---- Markers: สิ่งที่แสดงบนแมพ ---- */}
        <Section
          icon="🧭" title="Markers" open={openSec.layers} onToggle={() => toggleSec('layers')}
          badge={[showExtracts && 'exits', showTransits && 'transits', showKeys && 'keys'].filter(Boolean).length || 'off'}
          badgeColor={showExtracts || showTransits || showKeys ? '#10b981' : '#64748b'}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'Exits', on: showExtracts, set: setShowExtracts, color: '#23cc94' },
              { label: 'Transits', on: showTransits, set: setShowTransits, color: '#ff9696' },
              { label: 'Keys', on: showKeys, set: setShowKeys, color: '#eab308' },
              { label: 'Labels', on: showLabels, set: setShowLabels, color: '#3bc0fb' },
            ].map(f => (
              <div key={f.label} onClick={() => f.set(!f.on)} style={UI.pill(f.on, f.color)}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: f.color, opacity: f.on ? 1 : 0.35 }} />
                {f.label}
              </div>
            ))}
          </div>

          {/* ตัวกรองฝ่ายของทางออก — โชว์เฉพาะเมื่อเปิดทางออกไว้ ไม่เกะกะตอนปิด */}
          {showExtracts && (
            <div style={{ marginTop: '10px' }}>
              <div style={UI.label}>Exit faction</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {['pmc', 'scav', 'shared'].map(f => (
                  <div
                    key={f}
                    onClick={() => setExtractFactions(prev => ({ ...prev, [f]: !prev[f] }))}
                    style={UI.chip(extractFactions[f], FACTION_COLORS[f])}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: FACTION_COLORS[f], opacity: extractFactions[f] ? 1 : 0.35 }} />
                    {f.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ปักหมุดเอง — อยู่กลุ่มเดียวกับของที่แสดงบนแมพ */}
          <button
            onClick={() => setPinMode(v => !v)}
            style={{
              marginTop: '10px', width: '100%', padding: '8px', borderRadius: '9px', cursor: 'pointer',
              border: `1px solid ${pinMode ? '#facc15' : '#2a3550'}`,
              background: pinMode ? '#facc15' : '#0e1730',
              color: pinMode ? '#000' : '#94a3b8', fontWeight: 700, fontSize: '14px', transition: 'all .15s ease',
            }}
            title="Toggle, then click the map to drop a pin"
          >
            {pinMode ? '📍 Click the map to place' : '📍 Add pin'}
            {pinsHere.length > 0 && !pinMode && <span style={{ color: '#a3b4d7', fontWeight: 600 }}> · {pinsHere.length} here</span>}
          </button>
          {useSatellite && tileLevel != null && (
            <div style={{ fontSize: '12px', color: '#a4b4d5', marginTop: '8px' }}>
              Satellite detail {tileLevel}/{maxLevel} · {tiles.length} tiles · zoom in for more
            </div>
          )}
        </Section>

        {/* ---- Floors: เฉพาะแมพที่ไฟล์ SVG แยกชั้นไว้ ---- */}
        {!useSatellite && floors.length > 1 && (
          <Section
            icon="🏢" title="Floors" open={openSec.floors} onToggle={() => toggleSec('floors')}
            badge={`${visibleFloors.length}/${floors.length}`}
            badgeColor={visibleFloors.length === floors.length ? '#a78bfa' : '#f59e0b'}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {floors.map(f => {
                const on = visibleFloors.includes(f.name);
                return (
                  <div
                    key={f.name}
                    onClick={() => setVisibleFloors(prev => (
                      prev.includes(f.name) ? prev.filter(n => n !== f.name) : [...prev, f.name]
                    ))}
                    style={UI.chip(on, '#a78bfa')}
                    title={on ? 'Click to hide this floor' : 'Click to show this floor'}
                  >
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa', opacity: on ? 1 : 0.35 }} />
                    {f.name}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
              <div onClick={() => setVisibleFloors(floors.map(f => f.name))} style={UI.chip(false, '#7c8db0')}>Show all</div>
              <div onClick={() => setVisibleFloors(['Ground'])} style={UI.chip(false, '#7c8db0')}>Ground only</div>
            </div>
          </Section>
        )}
        </>)}
        </div>

        {/* ---- ท้ายไซด์บาร์: เครดิตผู้วาดแมพ (CC BY-NC-SA) ---- */}
        {credit && (
          <div style={{
            flexShrink: 0, padding: '8px 14px 10px', borderTop: '1px solid #1e293b',
            background: '#0d1526', fontSize: '12px', color: '#a4b4d5', lineHeight: 1.5,
          }}>
            Map art: {credit.link
              ? <a href={credit.link} target="_blank" rel="noopener noreferrer" style={{ color: '#74b9ff' }}>{credit.author}</a>
              : credit.author} · CC BY-NC-SA 4.0
          </div>
        )}
      </aside>

      <main style={{
        ...styles.main,
        width: 'auto',
        flex: 1,
      }}>
        {isLoading && <div style={{ position: 'absolute', zIndex: 60, color: '#74b9ff' }}>SYNCING...</div>}

        <div style={styles.coordBox}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            GAME POS: <span style={{ color: '#ff9696' }}>X: {mousePos.gameX}, Z: {mousePos.gameZ}</span>
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#a5b5cc' }}>{currentMapName} TACTICAL ALIGNMENT</p>
        </div>

        <div style={styles.zoomControls}>
          <button style={styles.zoomBtn} onClick={() => rotateMap(-90)} title="Rotate Left">⟲</button>
          <button style={styles.zoomBtn} onClick={() => rotateMap(90)} title="Rotate Right">⟳</button>
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.min(10, z * 1.4))}>+</button>
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.max(0.5, z / 1.4))}>-</button>
          <button style={{ ...styles.zoomBtn, fontSize: '14px' }} onClick={resetZoom}>RST</button>
          <button style={{ ...styles.calibrationBtn, fontSize: '14px', backgroundColor: showCalibration ? 'rgba(246, 59, 59, 0.9)' : 'rgba(15, 23, 42, 0.9)', }} onClick={() => setShowCalibration(!showCalibration)}>Calib</button>
        </div>

        {/* Calibration Panel */}
        {showCalibration && (
          <div style={styles.calibrationPanel}>
            <div>
              <label style={styles.label}>Origin Offset X (%)</label>
              <div style={styles.controlRow}>
                <input type="range" min="0" max="100" step="0.001" style={{ flex: 1 }} value={calib.offsetX} onChange={e => updateCalib({ offsetX: parseFloat(e.target.value) })} />
                <input type="number" step="0.001" style={styles.inputNumber} value={calib.offsetX} onChange={e => updateCalib({ offsetX: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <label style={styles.label}>Origin Offset Z (%)</label>
              <div style={styles.controlRow}>
                <input type="range" min="0" max="100" step="0.001" style={{ flex: 1 }} value={calib.offsetZ} onChange={e => updateCalib({ offsetZ: parseFloat(e.target.value) })} />
                <input type="number" step="0.001" style={styles.inputNumber} value={calib.offsetZ} onChange={e => updateCalib({ offsetZ: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <label style={styles.label}>Coord Scale X</label>
              <div style={styles.controlRow}>
                <input type="range" min="0.0001" max="0.3" step="0.0001" style={{ flex: 1 }} value={calib.scaleX} onChange={e => updateCalib({ scaleX: parseFloat(e.target.value) })} />
                <input type="number" step="0.0001" style={styles.inputNumber} value={calib.scaleX} onChange={e => updateCalib({ scaleX: parseFloat(e.target.value) || 0.0001 })} />
              </div>
            </div>

            <div>
              <label style={styles.label}>Coord Scale Z</label>
              <div style={styles.controlRow}>
                <input type="range" min="0.0001" max="0.3" step="0.0001" style={{ flex: 1 }} value={calib.scaleZ} onChange={e => updateCalib({ scaleZ: parseFloat(e.target.value) })} />
                <input type="number" step="0.0001" style={styles.inputNumber} value={calib.scaleZ} onChange={e => updateCalib({ scaleZ: parseFloat(e.target.value) || 0.0001 })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={calib.flipX} onChange={e => updateCalib({ flipX: e.target.checked })} />
                Invert X
              </label>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={calib.flipZ} onChange={e => updateCalib({ flipZ: e.target.checked })} />
                Invert Z
              </label>
              <label style={{ ...styles.checkboxRow, gridColumn: 'span 2' }}>
                <input type="checkbox" checked={calib.swapXZ} onChange={e => updateCalib({ swapXZ: e.target.checked })} />
                Swap X/Z Axes
              </label>
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          style={{
            width: '100%', height: '100%', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',   // ลากในกรอบแมพไม่ควรไปคลุมข้อความของป้าย/หมุด
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if (pinMode) { const { x, y } = pctFromEvent(e); addPin(x, y); return; }
            // กันเบราว์เซอร์เริ่ม "เลือกข้อความ" ตั้งแต่จังหวะกด — ต้นเหตุที่ลากแล้วคลุมดำ
            e.preventDefault();
            setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
          }}
          onWheel={(e) => {
            // ซูมเข้า/ออกโดยยึดตำแหน่งเมาส์ (zoom-to-cursor) — ปรับ offset ให้จุดใต้เมาส์อยู่กับที่
            const rect = e.currentTarget.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;  // เมาส์เทียบจุดกึ่งกลาง (= transform origin)
            const cy = e.clientY - rect.top - rect.height / 2;
            // ซูมแบบ multiplicative (สม่ำเสมอทุกระดับ + ไวขึ้น) + ปรับตามแรง scroll · cap กันกระโดดแรงไป
            const step = Math.max(-0.6, Math.min(0.6, -e.deltaY * 0.003));
            const nz = Math.max(0.5, Math.min(10, zoom * Math.exp(step)));
            if (nz === zoom) return;
            const f = nz / zoom;
            setOffset(clampOffset(
              { x: cx - f * (cx - offset.x), y: cy - f * (cy - offset.y) },
              nz,
              rect,
            ));
            setZoom(nz);
          }}
        >
          <div style={{
            position: 'relative',
            display: 'inline-block',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'center'
          }}>
            {useSatellite ? (
              /* ภาพจริงจากเกม: วาง tile เป็น % ของกรอบแมพ (กรอบเดียวกับ SVG หมุดจึงตรงทั้งสองแบบ)
                 loading="lazy" ทำให้เบราว์เซอร์โหลดเฉพาะ tile ที่เข้ามาในจอ */
              <div
                ref={imageRef}
                style={{
                  display: 'block', height: '85vh', aspectRatio: boxRatio || 1,
                  position: 'relative', overflow: 'hidden', backgroundColor: '#0b1120',
                  userSelect: 'none', pointerEvents: 'none',
                }}
              >
                {tiles.map(t => (
                  <img draggable={false}
                    key={t.key}
                    src={t.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    style={{
                      position: 'absolute',
                      left: `${t.leftPct}%`, top: `${t.topPct}%`,
                      width: `${t.widthPct}%`, height: `${t.heightPct}%`,
                    }}
                  />
                ))}
              </div>
            ) : svgMarkup ? (
              /* กล่องอ้าง bounds เสมอ (ชุดพิกัดเดียวกับ satellite) แล้ววางภาพ SVG ข้างในตาม svgBounds
                 -> สลับ Abstract/Satellite แล้วหมุดไม่ขยับ ต่างกันแค่ภาพพื้นหลัง
                 Reserve เป็นเคสที่ภาพ SVG ครอบพื้นที่ไม่เท่าชุด tile */
              <div
                ref={imageRef}
                style={{
                  display: 'block', height: '85vh', aspectRatio: boxRatio || 1,
                  position: 'relative', overflow: 'hidden',
                  userSelect: 'none', pointerEvents: 'none',
                }}
              >
                <div
                  className="eft-map-svg"
                  style={{
                    position: 'absolute',
                    left: `${svgBox?.leftPct ?? 0}%`,
                    top: `${svgBox?.topPct ?? 0}%`,
                    width: `${svgBox?.widthPct ?? 100}%`,
                    height: `${svgBox?.heightPct ?? 100}%`,
                  }}
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              </div>
            ) : (
              <img draggable={false}
                ref={imageRef}
                src={imageSrc}
                onLoad={() => setIsLoading(false)}
                style={{ display: 'block', height: '85vh', width: 'auto', userSelect: 'none', pointerEvents: 'none' }}
              />
            )}

            {/* Origin Marker and Lines */}
            {showCalibration && (
              <>
                <div style={{
                  ...styles.origin,
                  left: `${calib.offsetX}%`,
                  top: `${calib.offsetZ}%`,
                  transform: `translate(-50%, -50%) scale(${markerScale})`
                }} />
                <div style={{ ...styles.originLine, left: `${calib.offsetX}%`, top: 0, bottom: 0, width: `${1 * markerScale}px` }} />
                <div style={{ ...styles.originLine, top: `${calib.offsetZ}%`, left: 0, right: 0, height: `${1 * markerScale}px` }} />
              </>
            )}

            {/* Extract Outlines (SVG Layer) */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25 }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {showExtracts && !isLoading && visibleFeatures.extracts.map((ext, idx) => {
                if (!ext.outline || ext.outline.length === 0) return null;
                if (extractFactions[ext.faction] === false) return null;

                // ใช้ posToPerc ตัวเดียวกับหมุด ไม่คำนวณเองซ้ำ ไม่งั้นกรอบเยื้องจากหมุด
                const pointsStr = ext.outline
                  .map(pt => posToPerc({ x: pt.x, y: pt.y ?? 0, z: pt.z }))
                  .map(p => `${p.x},${p.y}`)
                  .join(' ');

                const col = factionColor(ext.faction);
                // โชว์พื้นที่เฉพาะตอนชี้เมาส์ที่หมุด หรือคลิกปักไว้ (แบบ tarkov.dev)
                if (!areaShown(areaKey('ext', ext, idx))) return null;

                return (
                  <polygon
                    key={`outline-${idx}`}
                    points={pointsStr}
                    fill={col}
                    fillOpacity={0.16}
                    stroke={col}
                    strokeOpacity={0.9}
                    strokeWidth={0.75}          /* บางลง ไม่ให้กรอบหนาเกินตัวแมพ */
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Extracts Markers (Labels) */}
            {showExtracts && !isLoading && visibleFeatures.extracts.map((ext, idx) => {
              if (extractFactions[ext.faction] === false) return null;
              const p = posToPerc(ext.position);
              const col = factionColor(ext.faction);

              return (
                /* แบบเดียวกับ tarkov.dev/map: ไอคอนฝ่าย 24px + ชื่อวางข้าง ๆ
                   ตัวหนังสือขาว หนา มีขอบดำ (text-stroke + text-shadow) ไม่มีป้ายพื้นทึบ
                   -> อ่านได้ทั้งบนพื้นสว่างและพื้นเข้ม และไม่บังรายละเอียดแมพ */
                <div
                  key={`ext-${idx}`}
                  onMouseEnter={() => setHoverArea(areaKey('ext', ext, idx))}
                  onMouseLeave={() => setHoverArea(null)}
                  onMouseDown={(e) => e.stopPropagation()}   // กันลากแมพตอนคลิกหมุด
                  onClick={() => toggleArea(areaKey('ext', ext, idx))}
                  title={`${ext.name} (${ext.faction}) — click to keep the area shown`}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    zIndex: 28, display: 'flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap', pointerEvents: 'auto', cursor: 'pointer',
                  }}
                >
                  <img draggable={false}
                    src={factionImg(ext.faction)}
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => { e.target.src = 'https://tarkov.dev/maps/interactive/extract_scav.png'; }}
                    title={`${ext.name} (${ext.faction})`}
                    alt=""
                    style={{
                      width: '24px', height: '24px', flexShrink: 0,
                      filter: 'drop-shadow(0 0 2px #000) drop-shadow(0 0 4px rgba(0,0,0,0.9))',
                    }}
                  />
                  {showLabels && (
                    /* อ่านง่ายขึ้น: ตัวอักษรขาวบนพื้นเข้มโปร่ง + ขีดสีฝ่ายด้านซ้ายเป็นตัวบอกฝ่าย
                       (ตัวอักษรสีฝ่ายล้วนอ่านยากบนพื้นที่สีใกล้กัน เช่น scav ส้มบนพื้นทราย) */
                    <span
                      style={{
                        fontSize: '13px', fontWeight: 700, color: '#f2f6ff', lineHeight: 1.35,
                        padding: '0 5px 0 4px',
                        borderRadius: '3px',
                        borderLeft: `2px solid ${col}`,
                        background: 'rgba(6,10,20,0.72)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                        letterSpacing: '.01em',
                      }}
                      title={`${ext.name} (${ext.faction})`}
                    >
                      {ext.name}
                    </span>
                  )}
                </div>
              );
            })}

            {/* transit Outlines (SVG Layer) */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25 }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {showTransits && !isLoading && visibleFeatures.transits.map((ext, idx) => {
                if (!ext.outline || ext.outline.length === 0) return null;

                // ใช้ posToPerc ตัวเดียวกับหมุด ไม่คำนวณเองซ้ำ ไม่งั้นกรอบเยื้องจากหมุด
                const pointsStr = ext.outline
                  .map(pt => posToPerc({ x: pt.x, y: pt.y ?? 0, z: pt.z }))
                  .map(p => `${p.x},${p.y}`)
                  .join(' ');

                // เหมือนทางออก: โชว์เฉพาะตอนชี้/ปักไว้ · สี #e53500 ตามที่ tarkov.dev ใช้
                if (!areaShown(areaKey('trans', ext, idx))) return null;

                return (
                  <polygon
                    key={`trans-outline-${idx}`}
                    points={pointsStr}
                    fill="#e53500"
                    fillOpacity={0.16}
                    stroke="#e53500"
                    strokeOpacity={0.9}
                    strokeWidth={0.75}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Transits */}
            {showTransits && !isLoading && visibleFeatures.transits.map((trans, idx) => {
              const p = posToPerc(trans.position);
              const label = trans.description || 'Transit';

              return (
                <div
                  key={`trans-${idx}`}
                  onMouseEnter={() => setHoverArea(areaKey('trans', trans, idx))}
                  onMouseLeave={() => setHoverArea(null)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => toggleArea(areaKey('trans', trans, idx))}
                  title={`${label} — click to keep the area shown`}
                  style={{
                    position: 'absolute',
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    zIndex: 28, display: 'flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap', pointerEvents: 'auto', cursor: 'pointer',
                  }}
                >
                  <img draggable={false}
                    src={`https://tarkov.dev/maps/interactive/extract_transit.png`}
                    onLoad={() => setIsLoading(false)}
                    title={label}
                    alt=""
                    style={{
                      width: '24px', height: '24px', flexShrink: 0,
                      filter: 'drop-shadow(0 0 2px #000) drop-shadow(0 0 4px rgba(0,0,0,0.9))',
                    }}
                  />
                  {showLabels && (
                    <span
                      style={{
                        fontSize: '13px', fontWeight: 700, color: '#f2f6ff', lineHeight: 1.35,
                        padding: '0 5px 0 4px',
                        borderRadius: '3px',
                        borderLeft: '2px solid #e53500',
                        background: 'rgba(6,10,20,0.72)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                      }}
                      title={label}
                    >
                      {label}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Keys */}
            {showKeys && !isLoading && visibleFeatures.locks.map((keys, idx) => {
              const p = posToPerc(keys.position);

              return (
                <div key={`keys-${idx}`} >
                  <img draggable={false}
                    src={`https://tarkov.dev/maps/interactive/lock.png`}
                    onLoad={() => setIsLoading(false)}
                    title={keys.key.name || 'key'}
                    style={{
                      ...styles.extractMarker,
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    }}
                    onClick={() => setKeyDescription(keyDescription === idx ? null : idx)}
                  />
                  {keyDescription === idx && (
                    <div style={{
                      ...styles.descriptionMarker,
                      width: '120px',
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      display: 'flex',
                      flexDirection: 'column',
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`
                    }}
                      onClick={() => setKeyDescription(null)}>
                      {keys.key.name}
                      <img draggable={false} src={`${keys.key.imageLink}`} alt="" style={{ width: '50%', height: '50%', }} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quest Markers */}
            {!isLoading && trackedQuests.map(tq => {
              if (!tq.visible) return null;
              const quest = findQuest(tq);
              if (!quest) return null;
              const isExpanded = expandedQuestName === tq.id;

              return quest.objectives.map((obj, objIdx) => {
                if (checkedObjectives[getObjectiveKey(quest.id, obj.id)]) return null;
                const points = objectivePoints(obj);

                return points.map((p, idx) => {
                  // ข้อมูลเควสบางจุดเก็บแกนตั้งไว้ที่ y (ไม่มี z) -> ปรับให้เป็นรูปเดียวกันก่อนแปลง
                  const pos = p.z !== undefined ? p : { x: p.x, y: 0, z: p.y };
                  const mk = posToPerc(pos);
                  const isHere = selectedPoint?.questId === tq.id
                    && selectedPoint?.objId === obj.id
                    && selectedPoint?.idx === idx;

                  // --- FIX APPLIED BELOW ---
                  // Used React.Fragment with a key instead of shorthand <>
                  return (
                    <Fragment key={`${quest.name}-${objIdx}-${idx}`}>
                      {/* วงแหวนกระพริบรอบจุดที่เลือก — รายละเอียดอยู่ในแถบล่างซึ่งไม่ได้ชี้มาที่หมุด
                          จึงต้องมีอะไรบอกว่าแถบนั้นกำลังพูดถึงหมุดไหน ตอนที่หลายจุดหน้าตาเหมือนกัน
                          กรอบนอกคุมตำแหน่ง+สเกล กรอบในรับ animation จะได้ไม่ทับ transform กัน */}
                      {isHere && (
                        <div style={{
                          position: 'absolute',
                          left: `${mk.x}%`, top: `${mk.y}%`,
                          width: '12px', height: '12px',
                          transform: `translate(-50%, -50%) scale(${markerScale})`,
                          zIndex: 29, pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: '100%', height: '100%', borderRadius: '50%',
                            border: `2px solid ${tq.color}`,
                            animation: 'pulseSel 1.1s ease-out infinite',
                          }} />
                        </div>
                      )}
                      <div
                        style={{
                          ...styles.marker,
                          left: `${mk.x}%`,
                          top: `${mk.y}%`,
                          backgroundColor: tq.color,
                          cursor: 'pointer',
                          boxShadow: isHere ? '0 0 0 2px #fff, 0 0 10px rgba(0,0,0,0.9)' : styles.marker.boxShadow,
                          transform: `translate(-50%, -50%) scale(${isExpanded ? markerScale * 1.8 : markerScale}) rotate(${rotation}deg)`,
                          zIndex: isHere ? 101 : isExpanded ? 100 : 30,
                        }}
                        /* กดหมุดบนแมพไม่ควรลากแมพตามไปด้วย */
                        onMouseDown={(e) => e.stopPropagation()}
                        /* กดหมุดเดิมซ้ำ = ปิด · กดหมุดอื่น = ย้ายไปจุดนั้น (ไม่ต้องปิดก่อน)
                           ตัดสินจาก isHere ตัวเดียว ทั้ง selectedPoint และ expandedQuestName
                           จึงเปลี่ยนพร้อมกันเสมอ ไม่หลุดจากกันแบบที่เคยเป็น */
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPoint(isHere ? null : { questId: tq.id, objId: obj.id, idx });
                          setExpandedQuestName(isHere ? null : tq.id);
                        }}
                      />
                    </Fragment>
                  );
                });
              });
            })}

            {/* Custom Pins (ปักหมุดเอง) */}
            {!isLoading && pinsHere.map((pin) => (
              <div key={`pin-${pin.id}`} style={{
                position: 'absolute',
                left: `${pin.x}%`, top: `${pin.y}%`,
                transform: `translate(-50%, -100%) scale(${markerScale}) rotate(${-rotation}deg)`,
                zIndex: 40, cursor: 'pointer', textAlign: 'center', pointerEvents: 'auto',
              }}
                title={pin.label || 'Pin'}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove pin${pin.label ? ` "${pin.label}"` : ''}?`)) removePin(pin.id); }}
              >
                <div style={{ fontSize: '21px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px #000)' }}>📍</div>
                {pin.label && <div style={{ fontSize: '12px', color: '#fff', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '0 3px', whiteSpace: 'nowrap' }}>{pin.label}</div>}
              </div>
            ))}

            {/* Item Tracker pins (loot spawn) — หด/ขยายคุมผ่าน item tracker (t.expanded) */}
            {!isLoading && itemPinsHere.map((pin) => (
              <div key={`item-${pin.key}`} style={{
                position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`,
                transform: `translate(-50%, -50%) scale(${pin.expanded ? markerScale * 1.8 : markerScale}) rotate(${-rotation}deg)`,
                zIndex: pin.expanded ? 100 : 39, pointerEvents: 'none',
              }} title={pin.name}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: pin.color, border: '2px solid #fff', boxShadow: pin.expanded ? `0 0 8px ${pin.color}` : '0 0 4px #000' }} />
              </div>
            ))}

          </div>
        </div>

        {/* ---- แถบรายละเอียดจุดที่เลือก ----
            อยู่นอกกรอบที่ซูม/หมุน จึงคงขนาดเสมอ และยึดขอบล่างของกรอบแมพ
            ไม่ลอยทับผืนแมพแบบป้ายเดิม · เลี่ยงปุ่มซูม (ซ้าย) กับแผง Calib (ขวา) */}
        {pointDetail && (
          <div
            style={{ ...styles.pointBar, right: showCalibration ? 320 : 24 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.pointBarHead}>
              <span style={{
                width: '11px', height: '11px', borderRadius: '50%', flexShrink: 0,
                background: pointDetail.tq.color, border: '1px solid #fff',
              }} />
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#f1f7ff' }}>{pointDetail.quest.name}</span>
              {/* บอกลำดับจุดเฉพาะตอนมีหลายจุด — ของอย่าง Oil Run ที่รถน้ำมัน 4 คัน
                  คำอธิบายเหมือนกันหมด ตัวเลขนี้คือสิ่งเดียวที่แยกออกว่ากดคันไหนอยู่ */}
              {pointDetail.total > 1 && (
                <span style={styles.pointBarCount}>Spot {pointDetail.idx + 1} / {pointDetail.total}</span>
              )}
              <span style={{ flex: 1 }} />
              <button
                style={{ ...styles.descriptionDone, marginTop: 0, alignSelf: 'auto', flexShrink: 0 }}
                onClick={() => { completeMark(pointDetail.quest.id, pointDetail.obj.id); setSelectedPoint(null); }}
              >
                ✓ Done
              </button>
              <button style={styles.pointBarClose} onClick={() => setSelectedPoint(null)} title="Close">✕</button>
            </div>

            <div style={{ fontSize: '15px', lineHeight: 1.45, color: '#e6efff' }}>{pointDetail.obj.description}</div>

            {/* กุญแจกับของที่ต้องพกไปวางของเควสนี้บนแมพนี้ — แท็บด้านข้างมีรวมไว้แล้ว
                แต่ตอนยืนดูหมุดอยู่ไม่มีใครย้อนไปเปิดแท็บอ่าน */}
            {(() => {
              const keys = QuestComponent.questKeys(pointDetail.quest, currentMapName);
              const plants = QuestComponent.questPlantItems(pointDetail.quest, currentMapName);
              if (!keys.length && !plants.length) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {keys.map((k) => <KeyChip key={k.id} item={k} compact />)}
                  {plants.map((it) => (
                    <KeyChip key={it.id} item={it} compact note={placeNote({ ...it, mapName: null })} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>
      {/* SVG ยืดเต็มกล่องที่คำนวณจาก bounds (ไม่ยึดความสูงจอ) เพื่อให้ทับพื้นที่จริงพอดี */}
      <style>{`.eft-map-svg { line-height: 0; }
        .eft-map-svg > svg { display:block; width:100%; height:100%; }
        ${hiddenFloorCss}
        @keyframes pulseRing { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:.3;transform:translate(-50%,-50%) scale(1.6)} }
        @keyframes pulseSel { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.6)} }`}</style>
    </div>
  );
};

export default MapPage;
