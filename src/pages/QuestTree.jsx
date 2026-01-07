import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  RefreshCcw, 
  ChevronRight, 
  ChevronLeft,
  Target, 
  Award, 
  Lock, 
  Minimize2,
  Activity,
  Map as MapIcon,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';

// --- Configuration & Themes ---
const TRADER_THEMES = {
  "Prapor": { bg: "rgba(74, 20, 140, 0.4)", border: "#9c27b0", text: "#f3e5f5", accent: "#a855f7" },
  "Therapist": { bg: "rgba(1, 87, 155, 0.4)", border: "#03a9f4", text: "#e1f5fe", accent: "#3b82f6" },
  "Skier": { bg: "rgba(230, 81, 0, 0.4)", border: "#ff9800", text: "#fff3e0", accent: "#f97316" },
  "Peacekeeper": { bg: "rgba(27, 94, 32, 0.4)", border: "#4caf50", text: "#e8f5e9", accent: "#10b981" },
  "Mechanic": { bg: "rgba(38, 50, 56, 0.4)", border: "#607d8b", text: "#eceff1", accent: "#94a3b8" },
  "Ragman": { bg: "rgba(136, 14, 79, 0.4)", border: "#e91e63", text: "#fce4ec", accent: "#ec4899" },
  "Jaeger": { bg: "rgba(51, 105, 30, 0.4)", border: "#8bc34a", text: "#f1f8e9", accent: "#16a34a" },
  "Lightkeeper": { bg: "rgba(253, 224, 71, 0.2)", border: "#eab308", text: "#fefce8", accent: "#fde047" },
};

const NODE_WIDTH = 280;
const NODE_HEIGHT = 100;

// --- Memoized Components ---

const QuestEdge = React.memo(({ edge, isActive, isDimmed }) => {
  const startX = edge.source.x + NODE_WIDTH;
  const startY = edge.source.y + NODE_HEIGHT / 2;
  const endX = edge.target.x;
  const endY = edge.target.y + NODE_HEIGHT / 2;
  
  const dx = endX - startX;
  const cp1x = startX + dx * 0.5;
  const cp2x = startX + dx * 0.5;
  
  return (
    <path 
      d={`M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`}
      stroke={isActive ? "#eab308" : "#1e293b"}
      strokeWidth={isActive ? 3 : 1.5}
      fill="none"
      opacity={isDimmed ? 0.05 : 1}
      markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
      style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
    />
  );
});

const QuestNode = React.memo(({ node, isSelected, isPathActive, isDimmed, onHover, onClick }) => {
  const theme = TRADER_THEMES[node.trader.name] || TRADER_THEMES["Mechanic"];
  
  return (
    <div
      className="quest-node-card"
      style={{ 
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: `${NODE_WIDTH}px`,
        height: `${NODE_HEIGHT}px`,
        padding: '14px',
        borderRadius: '12px',
        border: `2px solid ${isSelected ? '#eab308' : (isPathActive ? '#fff' : theme.border)}`,
        backgroundColor: isPathActive ? theme.bg.replace('0.4', '0.6') : theme.bg,
        zIndex: isSelected || isPathActive ? 50 : 10,
        opacity: isDimmed ? 0.1 : 1,
        filter: isDimmed ? 'grayscale(100%)' : 'none',
        boxShadow: isPathActive ? `0 0 25px ${theme.border}55` : 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        willChange: 'transform, opacity'
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onClick(node); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', fontWeight: '900', color: theme.accent, letterSpacing: '0.1em' }}>
          {node.trader.name.toUpperCase()}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {node.kappaRequired && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} title="Kappa" />}
        </div>
      </div>
      
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', lineHeight: 1.2, flex: 1, marginTop: '4px' }}>
        {node.name}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapIcon size={12} style={{ opacity: 0.6 }} />
          <span>{node.map?.name || "Any Map"}</span>
        </div>
        <div style={{ fontWeight: '800' }}>LV.{node.minPlayerLevel}</div>
      </div>
    </div>
  );
});

import quests from "../data/tasks";






const QuestTree = () => {


  
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dagreLoaded, setDagreLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTrader, setSelectedTrader] = useState("All");
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [hoveredQuest, setHoveredQuest] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(0.5);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const searchRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/dagre/0.8.5/dagre.min.js";
    script.async = true;
    script.onload = () => setDagreLoaded(true);
    document.body.appendChild(script);

    const loadData = async () => {
        try {
  
            setAllTasks(quests);
        } catch (e) {
            console.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };
    loadData();

    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { 
      if (document.body.contains(script)) document.body.removeChild(script); 
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedQuest) {
        setIsFocusMode(false);
    } else {
        setIsSidebarOpen(true);
    }
  }, [selectedQuest]);

  // 1. Dagre Layout Calculation
  const { nodes, edges } = useMemo(() => {
    if (!dagreLoaded || !allTasks.length || typeof window.dagre === 'undefined') {
        return { nodes: [], edges: [] };
    }

    const dagre = window.dagre;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 180, marginx: 100, marginy: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const visibleIds = new Set();

    const addRecursiveAncestors = (id) => {
      if (!id || visibleIds.has(id)) return;
      visibleIds.add(id);
      const task = taskMap.get(id);
      task?.taskRequirements?.forEach(req => { if (req.task?.id) addRecursiveAncestors(req.task.id); });
    };

    if (isFocusMode && selectedQuest) {
      addRecursiveAncestors(selectedQuest.id);
    } else {
      let filteredTasks = allTasks;
      if (selectedTrader !== "All") filteredTasks = allTasks.filter(t => t.trader.name === selectedTrader);

      filteredTasks.forEach(t => {
        if (!debouncedSearch || t.name.toLowerCase().includes(debouncedSearch.toLowerCase())) {
          addRecursiveAncestors(t.id);
        }
      });
    }

    const currentTasks = allTasks.filter(t => visibleIds.has(t.id));
    currentTasks.forEach(task => g.setNode(task.id, { width: NODE_WIDTH, height: NODE_HEIGHT, task }));
    currentTasks.forEach(task => {
        task.taskRequirements?.forEach(req => {
            if (visibleIds.has(req.task.id)) g.setEdge(req.task.id, task.id);
        });
    });

    dagre.layout(g);

    const processedNodes = g.nodes().map(v => {
        const node = g.node(v);
        return { ...node.task, x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 };
    });

    const processedEdges = g.edges().map(e => ({
        id: `e-${e.v}-${e.w}`,
        source: processedNodes.find(n => n.id === e.v),
        target: processedNodes.find(n => n.id === e.w)
    }));

    return { nodes: processedNodes, edges: processedEdges };
  }, [allTasks, selectedTrader, debouncedSearch, dagreLoaded, isFocusMode, selectedQuest]);

  // 2. ฟังก์ชันจัดการการเลื่อนมากลางจอ (Auto-Centering)
  useEffect(() => {
    if (nodes.length === 0 || !canvasRef.current) return;

    const centerGraph = () => {
      // คำนวณขอบเขตของ Graph
      const minX = Math.min(...nodes.map(n => n.x));
      const maxX = Math.max(...nodes.map(n => n.x)) + NODE_WIDTH;
      const minY = Math.min(...nodes.map(n => n.y));
      const maxY = Math.max(...nodes.map(n => n.y)) + NODE_HEIGHT;

      const graphCenterX = (minX + maxX) / 2;
      const graphCenterY = (minY + maxY) / 2;

      // คำนวณพื้นที่ว่างของหน้าจอ (หัก Sidebar ออก)
      const sidebarWidth = (selectedQuest && isSidebarOpen) ? 450 : 0;
      const viewportWidth = window.innerWidth - sidebarWidth;
      const viewportHeight = window.innerHeight - 70; // หัก Header

      const targetCenterX = viewportWidth / 2;
      const targetCenterY = viewportHeight / 2;

      // ตั้งค่า Offset ใหม่ (ใช้ Zoom ปัจจุบัน)
      setOffset({
        x: targetCenterX - graphCenterX * zoom,
        y: targetCenterY - graphCenterY * zoom
      });
    };

    // ใช้ timeout เล็กน้อยเพื่อให้ Sidebar อนิเมชั่นเริ่มทำงานก่อนคำนวณพื้นที่
    const timer = setTimeout(centerGraph, 50);
    return () => clearTimeout(timer);
  }, [nodes, isSidebarOpen, selectedQuest]); // ทำงานเมื่อ Node เปลี่ยน หรือ Sidebar เปิด/ปิด

  // 3. Path Highlighting (Hover)
  const { activePathNodes, activePathEdges } = useMemo(() => {
    const activeNodes = new Set();
    const activeEdges = new Set();
    const targetId = hoveredQuest || (isFocusMode ? selectedQuest?.id : null);

    if (targetId) {
      activeNodes.add(targetId);
      const findAncestors = (id) => {
        for (const edge of edges) {
          if (edge.target.id === id) {
            if (!activeNodes.has(edge.source.id)) {
              activeNodes.add(edge.source.id);
              activeEdges.add(edge.id);
              findAncestors(edge.source.id);
            }
          }
        }
      };
      const findDescendants = (id) => {
        for (const edge of edges) {
          if (edge.source.id === id) {
            if (!activeNodes.has(edge.target.id)) {
              activeNodes.add(edge.target.id);
              activeEdges.add(edge.id);
              findDescendants(edge.target.id);
            }
          }
        }
      };
      findAncestors(targetId);
      if (!isFocusMode) findDescendants(targetId);
    }
    return { activePathNodes: activeNodes, activePathEdges: activeEdges };
  }, [hoveredQuest, edges, isFocusMode, selectedQuest]);

  // --- Interaction Handlers ---
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [isDragging]);

  const handleWheel = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomIntensity = 0.001;
    const delta = -e.deltaY * zoomIntensity;
    const newZoom = Math.max(0.1, Math.min(2, zoom * (1 + delta)));
    const scaleRatio = newZoom / zoom;
    setZoom(newZoom);
    setOffset({ 
      x: mouseX - (mouseX - offset.x) * scaleRatio, 
      y: mouseY - (mouseY - offset.y) * scaleRatio 
    });
  }, [zoom, offset]);

  const handleSelectFromSearch = (quest) => {
    setSelectedQuest(quest);
    setIsFocusMode(true);
    setShowSearchResults(false);
    setSearchTerm("");
  };

  const traders = useMemo(() => ["All", ...new Set(allTasks.map(t => t.trader.name))], [allTasks]);
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    return allTasks.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [allTasks, searchTerm]);

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', color: '#eab308' }}>
        <RefreshCcw className="animate-spin" size={32} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#020617', color: '#f8fafc', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .quest-node-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
        .quest-node-card:hover { transform: translateY(-4px); }
        .scroll-v::-webkit-scrollbar { width: 4px; }
        .scroll-v::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .search-input { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 10px 14px 10px 42px; color: white; width: 320px; outline: none; transition: 0.2s; }
        .search-input:focus { border-color: #eab308; }
        .focus-btn { background: #eab308; color: #000; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 800; display: flex; alignItems: center; gap: 8px; cursor: pointer; transition: 0.2s; width: 100%; justify-content: center; }
        .focus-btn:hover { background: #facc15; transform: scale(1.02); }
        .focus-btn.active { background: #ef4444; color: #fff; }
        .search-result-item { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #1e293b; transition: background 0.2s; display: flex; flex-direction: column; gap: 2px; }
        .search-result-item:hover { background: #1e293b; }
        .sidebar-toggle { position: absolute; left: -32px; top: 50%; transform: translateY(-50%); background: #0a0f1d; border: 1px solid #1e293b; border-right: none; color: #fff; width: 32px; height: 64px; border-radius: 12px 0 0 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 110; }
      `}</style>

      <header style={{ height: '70px', borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: '#eab308', color: '#000', fontWeight: 900, padding: '6px 12px', borderRadius: '6px' }}>TARK-V</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>Quest Flow</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{nodes.length} Visible Nodes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }} ref={searchRef}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', zIndex: 1 }} />
            <input 
              className="search-input" 
              placeholder="ค้นหาภารกิจ..." 
              value={searchTerm} 
              onChange={e => { setSearchTerm(e.target.value); setShowSearchResults(true); }} 
              onFocus={() => setShowSearchResults(true)}
              disabled={isFocusMode} 
            />
            {showSearchResults && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100 }}>
                {searchResults.map(quest => (
                  <div key={quest.id} className="search-result-item" onClick={() => handleSelectFromSearch(quest)}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{quest.name}</span>
                    <div style={{ fontSize: '10px', color: '#eab308' }}>{quest.trader.name.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <select 
            style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '12px' }}
            value={selectedTrader}
            onChange={e => setSelectedTrader(e.target.value)}
            disabled={isFocusMode}
          >
            {traders.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button onClick={() => { setIsFocusMode(false); setSearchTerm(""); setSelectedQuest(null); }} style={{ background: '#0f172a', border: '1px solid #334155', padding: '10px', borderRadius: '12px', color: '#fff' }}>
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      <main 
        ref={canvasRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onWheel={handleWheel}
      >
        <div style={{ 
          position: 'absolute', 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)' // เพิ่มความนุ่มนวลตอน Auto-Center
        }}>
          <svg width="20000" height="20000" style={{ pointerEvents: 'none', overflow: 'visible' }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" /></marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#eab308" /></marker>
            </defs>
            {edges.map(edge => (
              <QuestEdge 
                key={edge.id} 
                edge={edge} 
                isActive={activePathEdges.has(edge.id)} 
                isDimmed={(hoveredQuest || isFocusMode) && !activePathEdges.has(edge.id)} 
              />
            ))}
          </svg>

          {nodes.map(node => (
            <QuestNode 
              key={node.id}
              node={node}
              isSelected={selectedQuest?.id === node.id}
              isPathActive={activePathNodes.has(node.id)}
              isDimmed={(hoveredQuest || isFocusMode) && !activePathNodes.has(node.id)}
              onHover={setHoveredQuest}
              onClick={setSelectedQuest}
            />
          ))}
        </div>

        {/* Side Detail Panel */}
        <div style={{ 
          position: 'absolute', right: 0, top: 0, bottom: 0, 
          width: (selectedQuest && isSidebarOpen) ? '450px' : '0',
          background: '#0a0f1d', borderLeft: '1px solid #1e293b', backdropFilter: 'blur(30px)',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'visible', zIndex: 100
        }}>
          {selectedQuest && (
            <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
          )}

          {selectedQuest && isSidebarOpen && (
            <div style={{ width: '450px', padding: '2.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Intelligence</span>
                <button onClick={() => setSelectedQuest(null)} style={{ background: 'none', border: 'none', color: '#fff' }}><Minimize2 size={20} /></button>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1.5rem' }}>{selectedQuest.name}</h2>
              
              <button 
                className={`focus-btn ${isFocusMode ? 'active' : ''}`}
                onClick={() => setIsFocusMode(!isFocusMode)}
                style={{ marginBottom: '2rem' }}
              >
                {isFocusMode ? <EyeOff size={18} /> : <Eye size={18} />}
                {isFocusMode ? "แสดงเควสทั้งหมด" : "โฟกัสเส้นทางเควสนี้"}
              </button>

              <div className="scroll-v" style={{ flex: 1, overflowY: 'auto' }}>
                <section style={{ marginBottom: '2.5rem' }}>
                  <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}><Target size={14} inline /> Objectives</h4>
                  {selectedQuest.objectives?.map((obj, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', marginBottom: '0.5rem', fontSize: '14px', border: '1px solid #1e293b' }}>
                      {obj.description}
                    </div>
                  ))}
                </section>
                
                {selectedQuest.taskRequirements?.length > 0 && (
                  <section>
                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}><Lock size={14} inline /> Prerequisites</h4>
                    {selectedQuest.taskRequirements.map((req, i) => {
                      const reqTask = allTasks.find(t => t.id === req.task.id);
                      return (
                        <div key={i} onClick={() => reqTask && setSelectedQuest(reqTask)} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: reqTask ? '#eab308' : '#64748b' }}>{reqTask ? reqTask.name : "ภารกิจลับ"}</span>
                          {reqTask && <ChevronRight size={16} />}
                        </div>
                      );
                    })}
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

}

export default QuestTree;