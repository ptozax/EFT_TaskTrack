// pages/MapPage.jsx
import React, { useEffect, useState, useRef, Fragment } from 'react';
import quests from "../data/tasks";
import mapFeatures from "../data/maps";
import styles from '../Component/MapComponents';
import * as QuestComponent from '../Component/QuestComponent';
import { ChevronUpIcon, ChevronDownIcon } from '../Component/KappaComponent';

/* ---------------- STORAGE KEYS ---------------- */
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const STORAGE_KEY = "eft_selected_quests";
const MAP_KEY = "eft_selected_map";
const COMPLETE_KEY = "eft_completed_quests";

/* ---------------- MAP CONFIG ---------------- */
const maps = [
  { id: 0, map_name: "Factory", svg: "Factory", offsetX: 51.1, offsetZ: 54.3, scaleX: 0.76, scaleZ: 0.7, flipX: true, flipZ: true, swapXZ: true },
  { id: 1, map_name: "Customs", svg: "Customs", offsetX: 65.2, offsetZ: 56.3, scaleX: 0.094, scaleZ: 0.18, flipX: true, flipZ: false, swapXZ: false },
  { id: 2, map_name: "Woods", svg: "Woods", offsetX: 48.5, offsetZ: 67.3, scaleX: 0.0759, scaleZ: 0.0729, flipX: true, flipZ: false, swapXZ: false },
  { id: 3, map_name: "Shoreline", svg: "Shoreline", offsetX: 32.5, offsetZ: 39.8, scaleX: 0.0636, scaleZ: 0.0917, flipX: true, flipZ: false, swapXZ: false },
  { id: 4, map_name: "Interchange", svg: "Interchange", offsetX: 59.333, offsetZ: 49.238, scaleX: 0.1123, scaleZ: 0.1083, flipX: true, flipZ: false, swapXZ: false },
  { id: 5, map_name: "The Lab", svg: "labs", offsetX: 161.3, offsetZ: 111, scaleX: 0.33, scaleZ: 0.33, flipX: false, flipZ: false, swapXZ: true },
  { id: 6, map_name: "Reserve", svg: "Reserve", offsetX: 48.6, offsetZ: 50.856, scaleX: 0.163, scaleZ: 0.1797, flipX: true, flipZ: false, swapXZ: false },
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

/* ---------------- COMPONENT ---------------- */
const MapPage = () => {
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});
  const [completedQuests, setCompletedQuests] = useState([]);
  const [currentQuestId, setCurrentQuestId] = useState(null);

  const [selectedMapId, setSelectedMapId] = useState(1);
  const [trackedQuests, setTrackedQuests] = useState([]);
  const [expandedQuestName, setExpandedQuestName] = useState(null);
  const [questKeys, setQuestKeys] = useState([]);
  const [showQuestKey, setShowQuestKey] = useState(true);
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

  const currentMap = maps.find(m => m.id === selectedMapId);
  const currentMapName = currentMap?.map_name || "Unknown";
  const imageSrc = currentMap.id === 5 || currentMap.id === 10 ? `./${currentMap.svg}.png` : `https://assets.tarkov.dev/maps/svg/${currentMap.svg}.svg`;

  const calib = mapCalibrations[selectedMapId];

  const currentFeatures = mapFeatures.find(m => m.name === currentMapName) || { transits: [], extracts: [] };
  const [isRefresh, setIsRefresh] = useState(false);

  /* -------- LOAD LOCAL STORAGE -------- */
  useEffect(() => {
    try {
      const savedQuests = localStorage.getItem(STORAGE_KEY);
      const savedChecks = localStorage.getItem(OBJECTIVE_CHECK_KEY);
      const savemMap = localStorage.getItem(MAP_KEY);
      const saveComplete = localStorage.getItem(COMPLETE_KEY);

      if (savedQuests) setSelectedQuests(JSON.parse(savedQuests));
      if (savedChecks) setCheckedObjectives(JSON.parse(savedChecks));
      if (savemMap) setSelectedMapId(JSON.parse(savemMap));
      if (saveComplete) setCompletedQuests(JSON.parse(saveComplete));
    } catch (err) {
      console.error(err);
    }
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
        questsToAdd.push(quest.name);
      }
    });

    if (questsToAdd.length === 0) return;

    setTrackedQuests(prev => {
      const existingNames = new Set(prev.map(q => q.name));
      const usedColors = prev.map(q => q.color);

      const newItems = questsToAdd
        .filter(name => !existingNames.has(name))
        .map(name => ({
          name,
          color: getRandomColor(usedColors),
          visible: true
        }));

      return [...prev, ...newItems];
    });
  }, [selectedQuests, currentMapName]);
  // ----------- END on START -----------

  // --------- set localStorage of Quest ---------
  // selected quests
  useEffect(() => {
    if (isRefresh) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests));
    }
  }, [selectedQuests, isRefresh]);

  // objective checklist
  useEffect(() => {
    if (isRefresh) {
      localStorage.setItem(OBJECTIVE_CHECK_KEY, JSON.stringify(checkedObjectives));
    }
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

  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();

    // Exact percentage of the mouse over the image
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const pz = ((e.clientY - rect.top) / rect.height) * 100;

    let gx = (px - calib.offsetX) / (calib.scaleX * (calib.flipX ? -1 : 1));
    let gz = (pz - calib.offsetZ) / (calib.scaleZ * (calib.flipZ ? -1 : 1));

    if (calib.swapXZ) [gx, gz] = [gz, gx];

    setMousePos({
      x: px.toFixed(2),
      z: pz.toFixed(2),
      gameX: gx.toFixed(2),
      gameZ: gz.toFixed(2),
      rawPercX: px,
      rawPercZ: pz
    });

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const toggleQuestVisibility = (e, questName) => {
    e.stopPropagation();
    setTrackedQuests(trackedQuests.map(q =>
      q.name === questName ? { ...q, visible: !q.visible } : q
    ));
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
    const idsToRemove = new Set(newCompleted.map(u => u.id));
    idsToRemove.add(quest.id);
    idsToRemove.forEach(id => {
      removeQuest(id);
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
        width: isSidebarOpen ? '25%' : '0%',
        padding: isSidebarOpen ? '24px' : '0',
        opacity: isSidebarOpen ? 1 : 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800' }}>🗺️ Interactive Quest Map</h1>
          </header>
          <button
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            onClick={() => setIsSidebarOpen(false)}
            title="Close Sidebar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>

        <section>
          <label style={styles.label}>Map Region</label>
          <select
            style={styles.select}
            value={selectedMapId}
            onChange={(e) => {
              setSelectedMapId(Number(e.target.value));
              localStorage.setItem(
                MAP_KEY,
                JSON.stringify(Number(e.target.value))
              );
              setTrackedQuests([]);
              setExpandedQuestName(null);
            }}
          >
            {maps.map(map => <option key={map.id} value={map.id}>{map.map_name}</option>)}
          </select>
        </section>

        {/* Map Feature Toggles */}
        <section>
          <label style={styles.label}>Map Features</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={showExtracts} onChange={e => setShowExtracts(e.target.checked)} />
              Extracts
            </label>
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={showTransits} onChange={e => setShowTransits(e.target.checked)} />
              Transits
            </label>
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={showKeys} onChange={e => setShowKeys(e.target.checked)} />
              Keys
            </label>
          </div>
        </section>

        {questKeys.length > 0 && (
          <section>
            <div style={{ ...styles.label, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer', }}
              onClick={() => setShowQuestKey(!showQuestKey)}>
              Key Lists ({questKeys.length})
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1, justifyContent: 'flex-end', minWidth: '100px', color: 'white' }}>
                {showQuestKey ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
              </div>
            </div>
            {showQuestKey && (
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
          </section>

        )}

        <section style={{ flex: 1 }}>
          <label style={styles.label}>Tracked ({trackedQuests.length})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                      onClick={(e) => toggleQuestVisibility(e, tq.name)}
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
                          • {obj.description}
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
        </section>
      </aside>

      <main style={{
        ...styles.main,
        width: isSidebarOpen ? '75%' : '100%'
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
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.min(10, z + 0.5))}>+</button>
          <button style={styles.zoomBtn} onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}>-</button>
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
          onMouseDown={(e) => { if (e.button === 0) { setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); } }}
          onWheel={(e) => setZoom(prev => Math.max(0.5, Math.min(10, prev + (e.deltaY > 0 ? -0.1 : 0.1))))}
        >
          <div style={{
            position: 'relative',
            display: 'inline-block',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'center'
          }}>
            <img
              ref={imageRef}
              src={imageSrc}
              onLoad={() => setIsLoading(false)}
              style={{ display: 'block', height: '85vh', width: 'auto', userSelect: 'none', pointerEvents: 'none' }}
            />

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
              {showExtracts && !isLoading && currentFeatures.extracts.map((ext, idx) => {
                if (!ext.outline || ext.outline.length === 0) return null;

                const pointsStr = ext.outline.map(pt => {
                  let finalX = pt.x;
                  let finalVertical = pt.z;

                  if (calib.swapXZ) {
                    const temp = finalX;
                    finalX = finalVertical;
                    finalVertical = temp;
                  }

                  const xPerc = gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX);
                  const yPerc = gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ);
                  return `${xPerc},${yPerc}`;
                }).join(' ');

                const isPMC = ext.faction === 'pmc';
                const strokeColor = isPMC ? '#10b981' : '#f97316';
                const fillColor = isPMC ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)';

                return (
                  <polygon
                    key={`outline-${idx}`}
                    points={pointsStr}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={0.2 * markerScale}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Extracts Markers (Labels) */}
            {showExtracts && !isLoading && currentFeatures.extracts.map((ext, idx) => {
              let finalX = ext.position.x;
              let finalVertical = ext.position.z;
              if (calib.swapXZ) {
                const temp = finalX;
                finalX = finalVertical;
                finalVertical = temp;
              }

              const isPMC = ext.faction === 'pmc';

              return (
                <div key={`ext-${idx}`} >
                  <img
                    src={isPMC ? `https://tarkov.dev/maps/interactive/extract_pmc.png` : `https://tarkov.dev/maps/interactive/extract_scav.png`}
                    onLoad={() => setIsLoading(false)}
                    title={`${ext.name} (${ext.faction})`}
                    style={{
                      ...styles.extractMarker,
                      left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                      top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    }}
                  />
                </div>
              );
            })}

            {/* transit Outlines (SVG Layer) */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25 }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {showTransits && !isLoading && currentFeatures.transits.map((ext, idx) => {
                if (!ext.outline || ext.outline.length === 0) return null;

                const pointsStr = ext.outline.map(pt => {
                  let finalX = pt.x;
                  let finalVertical = pt.z;

                  if (calib.swapXZ) {
                    const temp = finalX;
                    finalX = finalVertical;
                    finalVertical = temp;
                  }

                  const xPerc = gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX);
                  const yPerc = gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ);
                  return `${xPerc},${yPerc}`;
                }).join(' ');

                return (
                  <polygon
                    key={`trans-outline-${idx}`}
                    points={pointsStr}
                    fill={'rgba(249, 22, 22, 0.2)'}
                    stroke={'#f91616ff'}
                    strokeWidth={0.2 * markerScale}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>

            {/* Transits */}
            {showTransits && !isLoading && currentFeatures.transits.map((trans, idx) => {
              let finalX = trans.position.x;
              let finalVertical = trans.position.z;
              if (calib.swapXZ) {
                const temp = finalX;
                finalX = finalVertical;
                finalVertical = temp;
              }

              return (
                <div key={`trans-${idx}`} >
                  <img
                    src={`https://tarkov.dev/maps/interactive/extract_transit.png`}
                    onLoad={() => setIsLoading(false)}
                    title={trans.description || 'Transit'}
                    style={{
                      ...styles.extractMarker,
                      left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                      top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    }}
                  />
                </div>
              );
            })}

            {/* Keys */}
            {showKeys && !isLoading && currentFeatures.locks.map((keys, idx) => {
              let finalX = keys.position.x;
              let finalVertical = keys.position.z;
              if (calib.swapXZ) {
                const temp = finalX;
                finalX = finalVertical;
                finalVertical = temp;
              }

              return (
                <div key={`keys-${idx}`} >
                  <img
                    src={`https://tarkov.dev/maps/interactive/lock.png`}
                    onLoad={() => setIsLoading(false)}
                    title={keys.key.name || 'key'}
                    style={{
                      ...styles.extractMarker,
                      left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                      top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                    }}
                    onClick={() => setKeyDescription(keyDescription === idx ? null : idx)}
                  />
                  {keyDescription === idx && (
                    <div style={{
                      ...styles.descriptionMarker,
                      width: '120px',
                      left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                      top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                      display: 'flex',
                      flexDirection: 'column',
                      transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`
                    }}
                      onClick={() => setKeyDescription(null)}>
                      {keys.key.name}
                      <img src={`${keys.key.imageLink}`} alt="" style={{ width: '50%', height: '50%',}}/>
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
                  let finalX = p.x;
                  let finalVertical = p.z !== undefined ? p.z : p.y;
                  let lastIndex = points.length - 1;

                  if (calib.swapXZ) {
                    const temp = finalX;
                    finalX = finalVertical;
                    finalVertical = temp;
                  }

                  // --- FIX APPLIED BELOW ---
                  // Used React.Fragment with a key instead of shorthand <>
                  return (
                    <Fragment key={`${quest.name}-${objIdx}-${idx}`}>
                      {!(checkedObjectives[getObjectiveKey(quest.id, obj.id)]) && (
                        <>
                          <div
                            style={{
                              ...styles.marker,
                              left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                              top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                              backgroundColor: tq.color,
                              transform: `translate(-50%, -50%) scale(${isExpanded ? markerScale * 1.8 : markerScale}) rotate(${rotation}deg)`,
                              zIndex: isExpanded ? 100 : 30,
                            }}
                            onClick={() => {setQuestDescription(questDescription === obj.id ? null : obj.id); setExpandedQuestName(isExpanded ? null : tq.name);}}
                          />
                          {questDescription === obj.id && idx === lastIndex && (
                            <div style={{
                              ...styles.descriptionMarker,
                              left: `${gameToPerc(finalX, calib.offsetX, calib.scaleX, calib.flipX)}%`,
                              top: `${gameToPerc(finalVertical, calib.offsetZ, calib.scaleZ, calib.flipZ)}%`,
                              display: 'flex',
                              flexDirection: 'column',
                              transform: `translate(-50%, -50%) scale(${markerScale}) rotate(${-rotation}deg)`,
                              zIndex: isExpanded ? 101 : 30,
                            }}
                              onClick={() => {setQuestDescription(null); setExpandedQuestName(isExpanded ? null : tq.name);}}>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapPage;
