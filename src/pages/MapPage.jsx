// pages/MapPage.jsx
import React, { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import questsStatic from "../data/tasks";
import mapFeaturesStatic from "../data/maps";
import itemsStatic from "../data/items.json";
import { useLiveData, getData } from '../data/gameStore';
import { mapStyles as styles, Icons } from '../Component/EftComponent';
import * as QuestComponent from '../Component/QuestComponent';
import ItemTracker from './ItemTracker';
import {
  findMapLayers, usableFloors, isMarkerVisible, mapCredit,
  hasSatellite, pickTileLevel, maxUsableTileLevel, tilesFor, tileRect,
  canPlaceByBounds, posToPercent, percentToPos, boundsAspect, svgPlacement,
} from './mapLayers';

/* ---------------- STORAGE KEYS ---------------- */
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const STORAGE_KEY = "eft_selected_quests";
const MAP_KEY = "eft_selected_map";
const COMPLETE_KEY = "eft_completed_quests";
const HIDDEN_KEY = "eft_select_quest_hidden";

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
    fontSize: '11px', fontWeight: 800, color: '#7c8db0',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
  },
  pill: (active, color) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '8px 6px', borderRadius: '10px', cursor: 'pointer', userSelect: 'none',
    fontSize: '12px', fontWeight: 700, transition: 'all .15s ease',
    border: `1px solid ${active ? color : '#2a3550'}`,
    background: active ? `${color}22` : '#0e1730',
    color: active ? color : '#64748b',
  }),
  // ป้ายเล็ก ๆ ท้ายหัวข้อ บอกสถานะได้แม้พับ section ไว้
  badge: (color = '#7c8db0') => ({
    fontSize: '10px', fontWeight: 800, letterSpacing: '.04em',
    padding: '1px 6px', borderRadius: '999px',
    background: `${color}1f`, color, whiteSpace: 'nowrap',
  }),
  chip: (active, color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '999px', cursor: 'pointer', userSelect: 'none',
    fontSize: '11px', fontWeight: 700, transition: 'all .15s ease',
    border: `1px solid ${active ? color : '#2a3550'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#64748b',
  }),
  sectionHead: (open) => ({
    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none',
    padding: '10px 12px', borderRadius: open ? '12px 12px 0 0' : '12px',
    background: open ? '#16223c' : '#111c33',
    border: '1px solid #24324f',
    borderBottom: open ? '1px solid #24324f' : '1px solid #24324f',
    fontSize: '11px', fontWeight: 800, color: '#9fb0d0',
    textTransform: 'uppercase', letterSpacing: '.1em',
  }),
  sectionBody: {
    border: '1px solid #24324f', borderTop: 'none', borderRadius: '0 0 12px 12px',
    background: 'linear-gradient(180deg,#101b31 0%,#0d1729 100%)', padding: '12px',
  },
  label: {
    fontSize: '10px', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '.1em', marginBottom: '6px',
  },
};

/* กล่องหัวข้อพับได้ ใช้หน้าตาเดียวกันทุก section ของ sidebar */
const Section = ({ icon, title, badge, badgeColor, open, onToggle, children }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={UI.sectionHead(open)} onClick={onToggle}>
      <span style={{ fontSize: '13px', filter: 'saturate(0.9)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{title}</span>
      {badge != null && <span style={UI.badge(badgeColor)}>{badge}</span>}
      <span style={{ color: '#64748b', display: 'flex' }}>
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
  /* ------------------ STATE SAVE ----------------------- */
  const [selectedQuests, setSelectedQuests] = useState(() => {
    const savedQuests = localStorage.getItem(STORAGE_KEY);
    return savedQuests ? JSON.parse(savedQuests) : []
  });
  const [checkedObjectives, setCheckedObjectives] = useState(() => {
    const savedChecklist = localStorage.getItem(OBJECTIVE_CHECK_KEY);
    return savedChecklist ? JSON.parse(savedChecklist) : {}
  });
  const [completedQuests, setCompletedQuests] = useState(() => {
    const savedCompleted = localStorage.getItem(COMPLETE_KEY);
    return savedCompleted ? JSON.parse(savedCompleted) : []
  });
  const [selectedMapId, setSelectedMapId] = useState(() => {
    const saveMap = localStorage.getItem(MAP_KEY);
    return saveMap ? JSON.parse(saveMap) : 1
  });
  const [hiddenQuests, setHiddenQuest] = useState(() => {
    const saveHidden = localStorage.getItem(HIDDEN_KEY);
    return saveHidden ? JSON.parse(saveHidden) : []
  })

  /* ------------------ STATE  ----------------------- */
  const [currentQuestId, setCurrentQuestId] = useState(null);
  const [trackedQuests, setTrackedQuests] = useState([]);
  const [expandedQuestName, setExpandedQuestName] = useState(null);
  const [questKeys, setQuestKeys] = useState([]);
  const [showQuestKey, setShowQuestKey] = useState(false);
  const [copiedKeyIndex, setCopiedKeyIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questDescription, setQuestDescription] = useState(null);
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
  const [customPins, setCustomPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PINS_KEY)) || {}; } catch { return {}; }
  });

  // --- Item Tracker (loot spawn) ---
  const ITEMS_KEY = 'eft_tracked_items';
  const LOOT_URL = `${import.meta.env.BASE_URL}loot_data.json`;
  const allItems = useLiveData(itemsStatic, 'items');       // รายการ item ทั้งหมด (ค้น/meta)
  const [loot, setLoot] = useState(null);                    // { mapId: { itemId: [pos] } }
  const [trackedItems, setTrackedItems] = useState(() => {   // [{id, hidden}]
    try { return JSON.parse(localStorage.getItem(ITEMS_KEY)) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(ITEMS_KEY, JSON.stringify(trackedItems)); }, [trackedItems]);
  useEffect(() => { getData('loot', LOOT_URL).then((d) => d && setLoot(d)).catch(() => {}); }, []);

  // หุบ/แสดง section ย่อยของ sidebar
  // markers เปิดไว้เป็นค่าเริ่มต้น (ใช้บ่อยสุด) ส่วนที่เหลือพับไว้ให้ไซด์บาร์โปร่ง
  const [openSec, setOpenSec] = useState({ layers: true, floors: false, quests: true });
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
  const [isRefresh, setIsRefresh] = useState(false);

  /* -------- LOAD LOCAL STORAGE -------- */
  useEffect(() => {
    const handleStorageChange = () => {
      try {

        const savedQuests = localStorage.getItem(STORAGE_KEY);
        const savedChecklist = localStorage.getItem(OBJECTIVE_CHECK_KEY);
        const savedCompleted = localStorage.getItem(COMPLETE_KEY);
        const saveHidden = localStorage.getItem(HIDDEN_KEY);

        setSelectedQuests(savedQuests ? JSON.parse(savedQuests) : []);
        setCheckedObjectives(savedChecklist ? JSON.parse(savedChecklist) : {});
        setCompletedQuests(savedCompleted ? JSON.parse(savedCompleted) : []);
        setHiddenQuest(saveHidden ? JSON.parse(saveHidden) : []);
        setTrackedQuests([]);
      } catch (err) {
        console.error(err);
      }
    };

    QuestComponent.callbackStorageChange(handleStorageChange);
  }, []);

  // ----------- on START -----------
  useEffect(() => {
    setIsLoading(true);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setIsRefresh(true);
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
  }, [selectedQuests, currentMapName]);
  // ----------- END on START -----------


  // --------- set localStorage of Quest ---------
  // selected quests
  useEffect(() => {
    if (isRefresh) localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests));
  }, [selectedQuests, isRefresh]);

  // objective checklist
  useEffect(() => {
    if (isRefresh) localStorage.setItem(OBJECTIVE_CHECK_KEY, JSON.stringify(checkedObjectives));
  }, [checkedObjectives, isRefresh]);

  // completed quests
  useEffect(() => {
    if (isRefresh) {
      localStorage.setItem(COMPLETE_KEY, JSON.stringify(completedQuests));

      if (currentQuestId) {

        const nextQuestList = QuestComponent.getNextQuestLists(completedQuests, currentQuestId);
        setSelectedQuests(prev => {
          // Use a Map or Set to ensure IDs are unique
          const allQuests = [...prev, ...nextQuestList];
          const uniqueMap = new Map(allQuests.map(q => [q.id, q]));
          return Array.from(uniqueMap.values());
        });
      }
    }
  }, [completedQuests, currentQuestId, isRefresh]);

  // hidden quest
  useEffect(() => {
    if (isRefresh) localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenQuests));
  }, [hiddenQuests, isRefresh]);
  // --------- END set localStorage of Quest ---------
  useEffect(() => {
    const accumulatedKeys = [];

    trackedQuests.forEach((tq) => {
      const fullQuest = quests.find(qd => qd.name === tq.name);

      // Safety check: skip if quest data isn't found
      if (!fullQuest || !fullQuest.neededKeys) return;

      fullQuest.neededKeys.forEach((keyGroup) => {
        // Check if the key is for the current map
        if (keyGroup.map?.name === currentMapName) {

          keyGroup.keys.forEach((subkey) => {
            // Push to the main array
            accumulatedKeys.push({
              questName: tq.name, // Useful to know WHICH quest needs this key
              keyName: subkey.name,
              image: subkey.baseImageLink,
              id: subkey.id, // specific ID if available, good for react keys
              backgroundColor: subkey.backgroundColor
            });
          });

        }
      });
    });

    // 3. Update state with the final array
    setQuestKeys(accumulatedKeys);
  }, [trackedQuests, currentMapName]);

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
  const posToPerc = (pos) => {
    if (useBoundsCoords) return posToPercent(layerEntry, pos);
    let fx = pos.x, fv = pos.z;
    if (calib.swapXZ) { const t = fx; fx = fv; fv = t; }
    return {
      x: gameToPerc(fx, calib.offsetX, calib.scaleX, calib.flipX),
      y: gameToPerc(fv, calib.offsetZ, calib.scaleZ, calib.flipZ),
    };
  };

  // % ของจุดที่คลิกเทียบกับภาพ (เหมือน handleMouseMove)
  const pctFromEvent = (e) => {
    const rect = imageRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  // เลื่อนแผนที่ให้จุด (x%,y%) มาอยู่กลางจอ (ชดเชย zoom + rotation)
  const centerOn = (xPerc, yPerc) => {
    const img = imageRef.current; if (!img) return;
    const dx = ((xPerc - 50) / 100) * img.clientWidth * zoom;
    const dy = ((yPerc - 50) / 100) * img.clientHeight * zoom;
    const rad = (rotation * Math.PI) / 180;
    setOffset({
      x: -(dx * Math.cos(rad) - dy * Math.sin(rad)),
      y: -(dx * Math.sin(rad) + dy * Math.cos(rad)),
    });
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
  }, [loot, tarkovMapId, trackedItems, calib, trackedNames]);
  const addPin = (xPerc, yPerc) => {
    const label = (typeof window !== 'undefined' && window.prompt('Pin label (optional):', '')) || '';
    setCustomPins(prev => {
      const next = { ...prev, [currentMapName]: [...(prev[currentMapName] || []), { id: Date.now(), x: xPerc, y: yPerc, label }] };
      localStorage.setItem(PINS_KEY, JSON.stringify(next));
      return next;
    });
  };
  const removePin = (id) => {
    setCustomPins(prev => {
      const next = { ...prev, [currentMapName]: (prev[currentMapName] || []).filter(p => p.id !== id) };
      localStorage.setItem(PINS_KEY, JSON.stringify(next));
      return next;
    });
  };

  /**
   * จำกัดระยะเลื่อนไม่ให้ลากแมพออกไปพ้นจอจนกลับมาหาไม่เจอ
   * เหลือให้แมพค้างในจออย่างน้อย ~25% ของด้านที่สั้นกว่าเสมอ
   */
  const clampOffset = (next, zoomValue, viewport) => {
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
  };

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    // ตอนลากแมพ ข้ามการอัปเดตตัวอ่านพิกัดใต้เมาส์ -> setState น้อยลงครึ่งหนึ่งต่อเฟรม
    // (ค่าพิกัดไม่มีประโยชน์ระหว่างลาก และการ re-render ถี่ ๆ ทำให้ SVG ที่ inline ไว้กระตุก)
    if (isDragging) {
      setOffset(clampOffset(
        { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y },
        zoom,
        e.currentTarget.getBoundingClientRect(),
      ));
      return;
    }
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

  const handleCopyName = (name, index) => {
    navigator.clipboard.writeText(name).then(() => {
      // Set the specific index as "copied"
      setCopiedKeyIndex(index);
      // Reset back to normal after 1.5 seconds
      setTimeout(() => setCopiedKeyIndex(null), 500);
    });
  };

  // ----------- QUEST ACTIONS -----------
  const removeQuest = (e, questName) => {
    e.stopPropagation();

    setTrackedQuests(trackedQuests.filter(q => q.name !== questName));
    if (expandedQuestName === questName) setExpandedQuestName(null);

    const rm_Quest = selectedQuests.find(q => q.name === questName);
    // ลบ quest
    if (rm_Quest) {
      setSelectedQuests((prev) =>
        prev.filter((q) => q.id !== rm_Quest.id)
      );
      // ลบ objective progress ของ quest นี้
      clearObjectiveProgress(rm_Quest.id);
    }
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

  const nextQuest = (e, questName) => {
    const quest = quests.find(q => q.name === questName);

    const newCompleted = QuestComponent.getPreviousQuestsList(quest.id, completedQuests);
    const idsToRemove = new Set(newCompleted.map(u => u.name));
    idsToRemove.add(quest.name);
    idsToRemove.forEach(name => {
      removeQuest(e, name);
    })

    setCurrentQuestId(quest.id);
    // Update state using a Set to ensure no duplicates
    setCompletedQuests(prev => {
      const uniqueSet = new Set([...prev, ...newCompleted]);
      return Array.from(uniqueSet);
    });
  }

  return (
    <div style={styles.container} onMouseUp={() => setIsDragging(false)}>
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
        <div style={{
          padding: '14px 14px 12px', borderBottom: '1px solid #1e293b',
          background: '#0d1526', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <span style={{ width: '3px', height: '20px', borderRadius: '3px', background: 'linear-gradient(#eab308,#f59e0b)' }} />
              <h1 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '.02em' }}>Quest Map</h1>
            </header>
            <button
              style={{ background: '#0e1730', border: '1px solid #24324f', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '3px 5px', display: 'flex' }}
              onClick={() => setIsSidebarOpen(false)}
              title="Hide panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          </div>

          <select
            style={{ ...styles.select, marginBottom: satelliteAvailable && abstractAvailable ? '8px' : 0 }}
            value={selectedMapId}
            onChange={(e) => {
              setSelectedMapId(Number(e.target.value));
              localStorage.setItem(MAP_KEY, JSON.stringify(Number(e.target.value)));
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
                      flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                      border: 'none', transition: 'all .15s ease',
                      background: on ? '#38bdf8' : 'transparent',
                      color: on ? '#0b1120' : '#7c8db0',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- เนื้อหาเลื่อนแยกจากส่วนหัว ---- */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 4px' }}>

        {/* ---- Markers: สิ่งที่แสดงบนแมพ ---- */}
        <Section
          icon="🧭" title="Markers" open={openSec.layers} onToggle={() => toggleSec('layers')}
          badge={[showExtracts && 'exits', showTransits && 'transits', showKeys && 'keys'].filter(Boolean).length || 'off'}
          badgeColor={showExtracts || showTransits || showKeys ? '#10b981' : '#64748b'}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'Exits', on: showExtracts, set: setShowExtracts, color: '#10b981' },
              { label: 'Transits', on: showTransits, set: setShowTransits, color: '#f91616' },
              { label: 'Keys', on: showKeys, set: setShowKeys, color: '#eab308' },
              { label: 'Labels', on: showLabels, set: setShowLabels, color: '#38bdf8' },
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
              color: pinMode ? '#000' : '#94a3b8', fontWeight: 700, fontSize: '12px', transition: 'all .15s ease',
            }}
            title="Toggle, then click the map to drop a pin"
          >
            {pinMode ? '📍 Click the map to place' : '📍 Add pin'}
            {pinsHere.length > 0 && !pinMode && <span style={{ color: '#7c8db0', fontWeight: 600 }}> · {pinsHere.length} here</span>}
          </button>
          {useSatellite && tileLevel != null && (
            <div style={{ fontSize: '10px', color: '#5b6b8c', marginTop: '8px' }}>
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

        {questKeys.length > 0 && (
          <Section
            icon="🔑" title="Keys needed" badge={questKeys.length} badgeColor="#eab308"
            open={showQuestKey} onToggle={() => setShowQuestKey(!showQuestKey)}
          >
            {(
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', fontWeight: '700',
                overflowY: questKeys.length > 5 ? 'scroll' : 'none',
                maxHeight: '400px'
              }}>
                {questKeys.map((keyItem, index) => {
                  const isJustCopied = copiedKeyIndex === index
                  return (
                    <div key={`${keyItem.questName}-${keyItem.keyName}-${index}`}
                      style={{
                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '6px',
                        backgroundColor: isJustCopied ? '#166534' : '#1e293b', // Green if copied, Dark Blue normal
                        border: isJustCopied ? '1px solid #22c55e' : '1px solid #334155',
                        transition: 'all 0.2s ease',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (!isJustCopied) e.currentTarget.style.backgroundColor = '#334155';
                      }}
                      onMouseLeave={(e) => {
                        if (!isJustCopied) e.currentTarget.style.backgroundColor = '#1e293b';
                      }}
                      onClick={() => handleCopyName(keyItem.keyName, index)}>
                      <div style={{ width: '60%' }}>
                        <div style={{ width: '100%' }}>
                          {keyItem.questName} :
                        </div>
                        {keyItem.keyName}
                      </div>
                      <img src={keyItem.image} alt={keyItem.keyName} />
                      <div style={{ display: 'flex', alignItems: 'right', justifyContent: 'flex-end', width: '10%' }} title='Copy name key'>
                        {isJustCopied ? (
                          /* Checkmark Icon (Success) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          /* Clipboard Icon (Normal) */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })
                }
              </div>
            )}
          </Section>
        )}

        <Section
          icon="🎯" title="Tracked quests" badge={trackedQuests.length || 'none'}
          badgeColor={trackedQuests.length ? '#38bdf8' : '#64748b'}
          open={openSec.quests} onToggle={() => toggleSec('quests')}
        >
          {(<>
          {trackedQuests.length === 0 && (
            <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
              No quests tracked yet
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
            {trackedQuests.map((tq) => {
              const fullQuest = quests.find(qd => qd.name === tq.name);
              const isExpanded = expandedQuestName === tq.name;

              return (
                <div
                  key={tq.name}
                  style={{
                    ...styles.questCard,
                    borderColor: isExpanded ? tq.color : '#334155',
                    borderWidth: isExpanded ? '2px' : '1px',
                    opacity: tq.visible ? 1 : 0.6
                  }}
                  onClick={() => setExpandedQuestName(isExpanded ? null : tq.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tq.visible ? tq.color : '#475569' }} />
                    <span style={{ display: 'flex', flexDirection: 'column', flex: 1, }}>
                      <div style={{ width: '100%', fontSize: '13px', fontWeight: '700', color: tq.visible ? '#f8fafc' : '#94a3b8' }}>{tq.name}</div>
                      <div>
                        <span style={{ width: '100%', fontSize: '13px', color: tq.visible ? '#f8fafc' : '#94a3b8' }}>{fullQuest.trader.name}</span>
                        {fullQuest.kappaRequired && (<span className={`badge rounded-pill m-1 bg-success `} >Kappa</span>)}
                        {fullQuest.lightkeeperRequired && (<span className={`badge rounded-pill m-1  bg-info `} >LightKeeper</span>)}
                      </div>
                      <span style={{ width: '100%', fontSize: '13px', color: tq.visible ? '#f8fafc' : '#94a3b8' }}>Start at LV: {fullQuest.minPlayerLevel}</span>
                    </span>
                    <button
                      onClick={(e) => toggleQuestVisibility(e, tq.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                      title={tq.visible ? "Hide markers" : "Show markers"}
                    >
                      {tq.visible ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => removeQuest(e, tq.name)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                    >
                      ×
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155', fontSize: '11px' }}>
                      <div>
                        <button
                          style={{
                            width: '100%', background: '#00c40aff', border: 'none',
                            borderRadius: "5px", color: '#ffffffff', cursor: 'default', fontSize: '15px', fontWeight: 'bold'
                          }}
                          onClick={(e) => nextQuest(e, tq.name)}>Complete</button>
                      </div>
                      <div style={{ marginBottom: '6px', color: '#94a3b8', fontWeight: 'bold' }}>Objectives:</div>
                      {fullQuest.objectives.map((obj, idx) => (
                        <div key={idx} style={{ marginBottom: '6px', color: '#cbd5e1', lineHeight: '1.4' }}>
                          • {obj.description}{["giveItem", "TaskObjectiveShoot", "shoot", "kill"].includes(obj.type) && <> <span className='text-info'>x {obj.count}</span> </>}
                          {(checkedObjectives[getObjectiveKey(fullQuest.id, obj.id)]) ? ' ✅' : ''}
                        </div>
                      ))}
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{fullQuest.experience} XP</span>
                        <a
                          href={fullQuest.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#60a5fa', textDecoration: 'none' }}
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
        </div>

        {/* ---- ท้ายไซด์บาร์: เครดิตผู้วาดแมพ (CC BY-NC-SA) ---- */}
        {credit && (
          <div style={{
            flexShrink: 0, padding: '8px 14px 10px', borderTop: '1px solid #1e293b',
            background: '#0d1526', fontSize: '10px', color: '#5b6b8c', lineHeight: 1.5,
          }}>
            Map art: {credit.link
              ? <a href={credit.link} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>{credit.author}</a>
              : credit.author} · CC BY-NC-SA 4.0
          </div>
        )}
      </aside>

      <main style={{
        ...styles.main,
        width: 'auto',
        flex: 1,
      }}>
        {isLoading && <div style={{ position: 'absolute', zIndex: 60, color: '#3b82f6' }}>SYNCING...</div>}

        <div style={styles.coordBox}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>
            GAME POS: <span style={{ color: '#ef4444' }}>X: {mousePos.gameX}, Z: {mousePos.gameZ}</span>
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: '#64748b' }}>{currentMapName} TACTICAL ALIGNMENT</p>
        </div>

        <div style={styles.zoomControls}>
          <button style={styles.zoomBtn} onClick={() => rotateMap(-90)} title="Rotate Left">⟲</button>
          <button style={styles.zoomBtn} onClick={() => rotateMap(90)} title="Rotate Right">⟳</button>
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.min(10, z * 1.4))}>+</button>
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.max(0.5, z / 1.4))}>-</button>
          <button style={{ ...styles.zoomBtn, fontSize: '12px' }} onClick={resetZoom}>RST</button>
          <button style={{ ...styles.calibrationBtn, fontSize: '12px', backgroundColor: showCalibration ? 'rgba(246, 59, 59, 0.9)' : 'rgba(15, 23, 42, 0.9)', }} onClick={() => setShowCalibration(!showCalibration)}>Calib</button>
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
          style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseMove={handleMouseMove}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            if (pinMode) { const { x, y } = pctFromEvent(e); addPin(x, y); return; }
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
                  <img
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
              <img
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
                  <img
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
                        fontSize: '11px', fontWeight: 700, color: '#f2f6ff', lineHeight: 1.35,
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
                  <img
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
                        fontSize: '11px', fontWeight: 700, color: '#f2f6ff', lineHeight: 1.35,
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
                  <img
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
                      <img src={`${keys.key.imageLink}`} alt="" style={{ width: '50%', height: '50%', }} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quest Markers */}
            {!isLoading && trackedQuests.map(tq => {
              if (!tq.visible) return null;
              const quest = quests.find(q => q.name === tq.name);
              const isExpanded = expandedQuestName === quest.name;

              return quest.objectives.map((obj, objIdx) => {
                const points = [];
                const isObjOnMap = obj.maps?.some(m => m.name === currentMapName || m.name === `${currentMapName} 21+`);
                if (isObjOnMap) {
                  obj.zones?.forEach(z => points.push(z.position));
                  obj.possibleLocations?.forEach(loc => loc.positions.forEach(p => points.push(p)));
                }

                return points.map((p, idx) => {
                  // ข้อมูลเควสบางจุดเก็บแกนตั้งไว้ที่ y (ไม่มี z) -> ปรับให้เป็นรูปเดียวกันก่อนแปลง
                  const pos = p.z !== undefined ? p : { x: p.x, y: 0, z: p.y };
                  const mk = posToPerc(pos);
                  let lastIndex = points.length - 1;

                  // --- FIX APPLIED BELOW ---
                  // Used React.Fragment with a key instead of shorthand <>
                  return (
                    <Fragment key={`${quest.name}-${objIdx}-${idx}`}>
                      {!(checkedObjectives[getObjectiveKey(quest.id, obj.id)]) && (
                        <>
                          <div
                            style={{
                              ...styles.marker,
                              left: `${mk.x}%`,
                              top: `${mk.y}%`,
                              backgroundColor: tq.color,
                              transform: `translate(-50%, -50%) scale(${isExpanded ? markerScale * 1.8 : markerScale}) rotate(${rotation}deg)`,
                              zIndex: isExpanded ? 100 : 30,
                            }}
                            onClick={() => { setQuestDescription(questDescription === obj.id ? null : obj.id); setExpandedQuestName(isExpanded ? null : tq.name); }}
                          />
                          {questDescription === obj.id && idx === lastIndex && (
                            <div style={{
                              ...styles.descriptionMarker,
                              left: `${mk.x}%`,
                              top: `${mk.y}%`,
                              display: 'flex',
                              flexDirection: 'column',
                              transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                              zIndex: isExpanded ? 101 : 30,
                            }}
                              onClick={() => { setQuestDescription(null); setExpandedQuestName(isExpanded ? null : tq.name); }}>
                              {obj.description}
                              <div style={{
                                width: '100%', background: '#00c40aff', border: 'none',
                                borderRadius: "5px", color: '#ff3c00ff', cursor: 'default', fontSize: '15px'
                              }}
                                onClick={() => completeMark(quest.id, obj.id)}>
                                DONE!!
                              </div>
                            </div>
                          )}
                        </>
                      )}
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
                <div style={{ fontSize: '18px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px #000)' }}>📍</div>
                {pin.label && <div style={{ fontSize: '9px', color: '#fff', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '0 3px', whiteSpace: 'nowrap' }}>{pin.label}</div>}
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
      </main>
      {/* SVG ยืดเต็มกล่องที่คำนวณจาก bounds (ไม่ยึดความสูงจอ) เพื่อให้ทับพื้นที่จริงพอดี */}
      <style>{`.eft-map-svg { line-height: 0; }
        .eft-map-svg > svg { display:block; width:100%; height:100%; }
        ${hiddenFloorCss}
        @keyframes pulseRing { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:.3;transform:translate(-50%,-50%) scale(1.6)} }`}</style>
    </div>
  );
};

export default MapPage;
