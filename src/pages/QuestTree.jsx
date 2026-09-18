import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import tasksStatic from "../data/tasks";
import { useLiveData } from '../data/gameStore';
import * as d3 from 'd3';
import dagre from 'dagre';
import { Icons, TRADER_THEMES } from '../Component/EftComponent.jsx';
import { P, card, chip, badge, label, Bar, SearchBox, IconButton } from '../Component/PanelUI.jsx';
import * as QuestComponent from '../Component/QuestComponent';

const COMPLETE_KEY = "eft_completed_quests";
const STORAGE_KEY = "eft_selected_quests";
const VIEW_KEY = "eft_tree_view";

const NODE_W = 260;
const NODE_H = 76;
const GAP_X = 40;
const GAP_Y = 30;

/* สีของโหนดตามสถานะ — ให้ตาจับได้ทันทีว่าอะไรทำไปแล้ว อะไรทำต่อได้
   โทนยกขึ้นจากเดิมทั้งชุด (ของเดิมเข้มจนผังดูดำไปหมด) พื้นโหนดสว่างกว่าพื้นผัง
   ตัวอักษรเกือบขาว ขอบใช้สีสดเป็นตัวแยกสถานะแทนการพึ่งความเข้มของพื้น */
const NODE_STATE = {
  done: { fill: '#1d4435', stroke: '#34d399', text: '#c6f6dd', sub: '#7fc9a6' },
  active: { fill: '#4a3d17', stroke: '#facc15', text: '#fdeeb4', sub: '#d3b459' },
  ready: { fill: '#27375a', stroke: '#6b95d6', text: '#e6efff', sub: '#9db5dd' },
  blocked: { fill: '#1e2a45', stroke: '#44557d', text: '#b3c1da', sub: '#7386a8' },
};

const CANVAS_BG = '#182444';   // พื้นผัง — สว่างกว่าแถบเครื่องมือ ให้ผังเป็นพระเอก
const GRID_DOT = '#2c3c63';    // จุดกริดจาง ๆ ช่วยให้รู้ว่ากำลังลากผังอยู่

const QuestTree = () => {
    const tasks = useLiveData(tasksStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static

    const [view, setView] = useState(() => {
        try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || { trader: 'All', hideDone: false, showLoose: true }; }
        catch { return { trader: 'All', hideDone: false, showLoose: true }; }
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQuest, setSelectedQuest] = useState(null);

    const svgRef = useRef(null);
    const gRef = useRef(null);
    const zoomRef = useRef(null);

    const [passedQuest, setPassedQuest] = useState([]);
    const [completeQuest, setCompleteQuest] = useState(() => {
        try { return JSON.parse(localStorage.getItem(COMPLETE_KEY)) || []; } catch { return []; }
    });
    const [curentQuest, setCurentQuest] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
    });
    const [isLoad, setIsLoad] = useState(false);

    useEffect(() => { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); }, [view]);

    function getCompletedQuests(quests, currentQuests) {
        const questMap = Object.fromEntries(quests.map(q => [q.id, q]));
        const completed = new Set();

        function dfs(id) {
            const quest = questMap[id];
            if (!quest) return;
            for (const req of quest.taskRequirements) {
                if (completed.has(req.task.id)) continue;
                if (req.status.some(s => ["active"].includes(s))) {
                    const activeTask = quests.find(t => t.id === req.task.id);
                    activeTask?.taskRequirements?.forEach(require => {
                        completed.add(require.task.id);
                        dfs(require.task.id);
                    });
                } else if (req.status.some(s => ["complete", "failed"].includes(s))) {
                    completed.add(req.task.id);
                    dfs(req.task.id);
                }
            }
        }

        currentQuests.forEach(dfs);
        return [...completed];
    }

    const onQuetsSccess = (successQuest) => {
        const passQuest = QuestComponent.getPreviousQuestsList(successQuest.id, JSON.parse(localStorage.getItem(COMPLETE_KEY)) || []);
        const idsToRemove = new Set(passQuest.map(u => u.id));
        idsToRemove.add(successQuest.id);

        const nextComplete = [...new Set([...completeQuest, ...passQuest])];
        setCompleteQuest(nextComplete);

        const nextCurrentQuest = curentQuest.filter(q => !idsToRemove.has(q.id));
        const nextquest = QuestComponent.getNextQuestLists(nextComplete, successQuest.id);
        setCurentQuest([...new Set([...nextCurrentQuest, ...nextquest])]);
    };

    const handleStorageChange = useCallback(() => {
        const completedQuests = JSON.parse(localStorage.getItem(COMPLETE_KEY)) || [];
        const curentQuests = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        const completedQuestsIds = completedQuests.map(q => q.id);
        const curentQuestIds = curentQuests.map(q => q.id);
        const passQuest = getCompletedQuests(tasks, curentQuestIds);
        const result = [...new Set([...completedQuestsIds, ...passQuest])];

        setCompleteQuest(result.map(r => ({ id: r, status: "complete" })));
        setCurentQuest(curentQuests);
    }, [tasks]);

    useEffect(() => {
        setIsLoad(true);
        handleStorageChange();
        return QuestComponent.callbackStorageChange(handleStorageChange);
    }, []);

    useEffect(() => {
        if (!isLoad) return;
        localStorage.setItem(COMPLETE_KEY, JSON.stringify(completeQuest));
        const completedQuestsIds = completeQuest.map(q => q.id);
        const curentQuestIds = curentQuest.map(q => q.id);
        const passQuest = getCompletedQuests(tasks, curentQuestIds);
        setPassedQuest([...new Set([...completedQuestsIds, ...passQuest])]);
    }, [completeQuest]);

    useEffect(() => {
        if (isLoad) localStorage.setItem(STORAGE_KEY, JSON.stringify(curentQuest));
    }, [curentQuest]);

    const doneSet = useMemo(() => new Set(passedQuest), [passedQuest]);
    const activeSet = useMemo(() => new Set(curentQuest.map(q => q.id)), [curentQuest]);

    /* ---------------- ตรรกะการประมวลผลกราฟ ---------------- */
    const { nodes, edges, layout, looseCount, looseTop, nodeById } = useMemo(() => {
        const empty = { nodes: [], edges: [], layout: null, looseCount: 0, looseTop: null, nodeById: new Map() };
        if (!tasks.length) return empty;

        let initialFiltered = tasks;
        if (view.trader !== "All") initialFiltered = tasks.filter(t => t.trader.name === view.trader);

        // สร้าง Set ของ ID ที่จะแสดง (รวม prerequisites ทั้งสาย)
        const visibleIds = new Set();
        const addWithPrereqs = (task) => {
            if (!task || visibleIds.has(task.id)) return;
            visibleIds.add(task.id);
            task.taskRequirements?.forEach(req => {
                const prereqTask = tasks.find(t => t.id === req.task.id);
                if (prereqTask) addWithPrereqs(prereqTask);
            });
        };
        initialFiltered.forEach(addWithPrereqs);
        if (searchTerm) {
            tasks.forEach(task => {
                if (task.name.toLowerCase().includes(searchTerm.toLowerCase())) addWithPrereqs(task);
            });
        }

        let finalTasks = tasks.filter(t => visibleIds.has(t.id));

        // ซ่อนเควสที่ทำเสร็จแล้ว (เก็บไว้เฉพาะที่ยังเป็นสะพานไปหาเควสที่ยังไม่เสร็จ)
        if (view.hideDone) {
            const keep = new Set(finalTasks.filter(t => !doneSet.has(t.id)).map(t => t.id));
            finalTasks = finalTasks.filter(t => keep.has(t.id));
            visibleIds.forEach(id => { if (!keep.has(id)) visibleIds.delete(id); });
        }

        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR', nodesep: GAP_Y, ranksep: 150 });
        g.setDefaultEdgeLabel(() => ({}));
        finalTasks.forEach(t => g.setNode(t.id, { width: NODE_W, height: NODE_H }));

        /* เส้นเชื่อม = ทุก taskRequirements ไม่ว่าเงื่อนไขจะเป็น complete / active / failed
           ของเดิม: ถ้าเงื่อนไขเป็น active จะข้ามเควสนั้นไปลากจาก "แม่ของมัน" แทน
           -> ถ้าแม่ไม่มีก็ไม่มีเส้นเลย ทำให้เควสลอยเดี่ยวทั้งที่มีสายจริง */
        const edgeData = [];
        const edgeSeen = new Set();
        finalTasks.forEach(t => {
            t.taskRequirements?.forEach(req => {
                const from = req.task?.id;
                if (!from || !visibleIds.has(from) || from === t.id) return;
                const key = `${from}->${t.id}`;
                if (edgeSeen.has(key)) return;
                edgeSeen.add(key);

                const status = req.status || [];
                // เงื่อนไขแบบ active = ปลดล็อกตั้งแต่เควสก่อนหน้ายัง "กำลังทำ" -> วาดเป็นเส้นประ
                const kind = status.includes('complete') ? 'complete'
                    : status.includes('active') ? 'active'
                        : status.includes('failed') ? 'failed' : 'complete';
                g.setEdge(from, t.id);
                edgeData.push({ source: from, target: t.id, kind });
            });
        });

        /* เควสที่ไม่มีเส้นเชื่อมเลย (ไม่มีทั้งแม่และลูก) มีถึง ~240 จาก 515
           ถ้าปล่อยให้ dagre จัด จะถูกวางเรียงลงมาเป็นแถวเดียว ผังสูงกว่า 33,000px
           เหลือแต่ความว่างเปล่า -> เอาออกจาก dagre แล้วจัดเป็นกริดต่อท้ายแทน */
        const connected = new Set(edgeData.flatMap(e => [e.source, e.target]));
        const loose = view.showLoose ? finalTasks.filter(t => !connected.has(t.id)) : [];
        finalTasks.filter(t => !connected.has(t.id)).forEach(t => g.removeNode(t.id));

        dagre.layout(g);
        const laidOut = g.graph();
        const treeWidth = laidOut.width || 0;
        const treeHeight = laidOut.height || 0;

        const positionedNodes = finalTasks
            .filter(t => connected.has(t.id))
            .map(t => {
                const pos = g.node(t.id);
                return { ...t, x: pos.x, y: pos.y };
            });

        const cols = Math.max(1, Math.floor((treeWidth || (NODE_W * 6)) / (NODE_W + GAP_X)));
        const looseStart = treeHeight + 160;
        loose.forEach((t, i) => {
            positionedNodes.push({
                ...t,
                isLoose: true,
                x: (i % cols) * (NODE_W + GAP_X) + NODE_W / 2,
                y: looseStart + Math.floor(i / cols) * (NODE_H + GAP_Y) + NODE_H / 2,
            });
        });

        const looseRows = Math.ceil(loose.length / cols);
        return {
            nodes: positionedNodes,
            edges: edgeData,
            layout: {
                width: Math.max(treeWidth, loose.length ? cols * (NODE_W + GAP_X) : 0),
                height: loose.length ? looseStart + looseRows * (NODE_H + GAP_Y) : treeHeight,
            },
            looseCount: loose.length,
            looseTop: loose.length ? looseStart : null,
            nodeById: new Map(positionedNodes.map(n => [n.id, n])),
        };
    }, [tasks, view.trader, view.hideDone, view.showLoose, searchTerm, doneSet]);

    /* สายที่เกี่ยวข้องกับเควสที่เลือก: พ่อแม่ทั้งหมด + ลูกหลานทั้งหมด
       เลือกแล้วส่วนที่ไม่เกี่ยวจะจางลง ทำให้อ่านเส้นทางได้ในผังที่มี 500 โหนด */
    const focus = useMemo(() => {
        if (!selectedQuest) return null;
        const up = new Map();   // target -> [source]
        const down = new Map(); // source -> [target]
        edges.forEach(e => {
            if (!up.has(e.target)) up.set(e.target, []);
            up.get(e.target).push(e.source);
            if (!down.has(e.source)) down.set(e.source, []);
            down.get(e.source).push(e.target);
        });
        const walk = (startId, map) => {
            const seen = new Set();
            const stack = [startId];
            while (stack.length) {
                const id = stack.pop();
                (map.get(id) || []).forEach(next => {
                    if (seen.has(next)) return;
                    seen.add(next);
                    stack.push(next);
                });
            }
            return seen;
        };
        const ancestors = walk(selectedQuest.id, up);
        const descendants = walk(selectedQuest.id, down);
        const all = new Set([...ancestors, ...descendants, selectedQuest.id]);
        return { all, ancestors, descendants };
    }, [selectedQuest, edges]);

    /* ---------------- D3 zoom / pan ---------------- */
    const fitView = useCallback((duration = 600) => {
        if (!svgRef.current || !layout || !zoomRef.current || !layout.width) return;
        const padding = 80;
        const w = svgRef.current.clientWidth;
        const h = svgRef.current.clientHeight;
        const scale = Math.min((w - padding) / layout.width, (h - padding) / layout.height, 1);
        const t = d3.zoomIdentity
            .translate(w / 2 - (layout.width / 2) * scale, h / 2 - (layout.height / 2) * scale)
            .scale(scale);
        d3.select(svgRef.current).transition().duration(duration).call(zoomRef.current.transform, t);
    }, [layout]);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const g = d3.select(gRef.current);
        const zoom = d3.zoom().scaleExtent([0.02, 3]).on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
        svg.call(zoom);
        zoomRef.current = zoom;
    }, []);

    useEffect(() => { if (nodes.length) fitView(750); }, [nodes.length, layout?.width, layout?.height]);

    // เลื่อนไปหาเควสที่ค้นเจอ
    useEffect(() => {
        if (!searchTerm || !nodes.length || !svgRef.current || !zoomRef.current) return;
        const match = nodes.find(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!match) return;
        const w = svgRef.current.clientWidth;
        const h = svgRef.current.clientHeight;
        const scale = 1;
        const t = d3.zoomIdentity.translate(w / 2 - match.x * scale, h / 2 - match.y * scale).scale(scale);
        d3.select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, t);
    }, [searchTerm, nodes]);

    const zoomBy = (k) => {
        if (!svgRef.current || !zoomRef.current) return;
        d3.select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, k);
    };

    // กดเควสในแผงรายละเอียดแล้วเลื่อนผังไปหาเควสนั้น
    const focusNode = (id) => {
        const node = nodeById.get(id);
        if (!node) return;
        setSelectedQuest(node);
        if (!svgRef.current || !zoomRef.current) return;
        const w = svgRef.current.clientWidth;
        const h = svgRef.current.clientHeight;
        const t = d3.zoomIdentity.translate(w / 2 - node.x, h / 2 - node.y).scale(1);
        d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, t);
    };

    const traders = useMemo(() => ["All", ...new Set(tasks.map(t => t.trader.name))], [tasks]);
    const stateOf = (node) => doneSet.has(node.id) ? 'done'
        : activeSet.has(node.id) ? 'active'
            : (node.taskRequirements || []).every(r => doneSet.has(r.task?.id)) ? 'ready' : 'blocked';

    const stats = useMemo(() => {
        const s = { done: 0, active: 0, ready: 0, blocked: 0 };
        nodes.forEach(n => { s[stateOf(n)] += 1; });
        return s;
    }, [nodes, doneSet, activeSet]);

    const set = (patch) => setView(v => ({ ...v, ...patch }));

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '93vh',
            overflow: 'hidden', background: P.bg, color: P.text,
            position: 'relative',   // ให้แผงรายละเอียดที่เป็น absolute ยึดกับกรอบหน้านี้ ไม่ใช่ทั้งหน้าเว็บ
        }}>
            {/* ---------------- toolbar ---------------- */}
            <header style={{
                background: 'rgba(11,18,34,.92)', backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${P.border}`, padding: '12px 16px',
                display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h1 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Quest Tree</h1>
                    <span style={{ ...label }}>{nodes.length} quests · {edges.length} links</span>
                </div>

                <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search quest name..." width={240} />

                {/* เทรดเดอร์ */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {traders.map(t => {
                        const color = t === 'All' ? P.gold : (TRADER_THEMES[t]?.bg || P.label);
                        return (
                            <span key={t} style={chip(view.trader === t, color)} onClick={() => set({ trader: t })}>
                                {t !== 'All' && <span style={{ width: 7, height: 7, borderRadius: 999, background: color }} />}
                                {t}
                            </span>
                        );
                    })}
                </div>

                <div style={{ flex: 1 }} />

                <span style={chip(view.hideDone, P.green)} onClick={() => set({ hideDone: !view.hideDone })}>
                    <Icons.Check size={13} /> Hide done
                </span>
                <span style={chip(view.showLoose, P.blue)} onClick={() => set({ showLoose: !view.showLoose })}>
                    Standalone {looseCount > 0 ? `(${looseCount})` : ''}
                </span>

                <div style={{ display: 'flex', gap: 5 }}>
                    <IconButton title="Zoom in" onClick={() => zoomBy(1.4)}><span style={{ fontSize: 16, fontWeight: 700 }}>+</span></IconButton>
                    <IconButton title="Zoom out" onClick={() => zoomBy(1 / 1.4)}><span style={{ fontSize: 18, fontWeight: 700 }}>−</span></IconButton>
                    <IconButton title="Fit to screen" onClick={() => fitView(500)}><Icons.Crosshair size={15} /></IconButton>
                </div>
            </header>

            {/* ---------------- กราฟ ---------------- */}
            <div style={{ flex: 1, position: 'relative', background: CANVAS_BG }}>
                {tasks.length === 0 ? (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: P.dim,
                    }}>
                        Loading quest data...
                    </div>
                ) : (
                    <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: 'grab' }}>
                        <defs>
                            <marker id="arrow" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 9 3.5, 0 7" fill="#5e739b" />
                            </marker>
                            <marker id="arrowHot" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 9 3.5, 0 7" fill={P.gold} />
                            </marker>
                            {/* จุดกริด: อยู่ในกลุ่มที่ซูม/ลากได้ เลยขยับไปพร้อมผัง รู้สึกว่ากำลังลากจริง */}
                            <pattern id="dots" width="44" height="44" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1.6" fill={GRID_DOT} />
                            </pattern>
                        </defs>

                        <g ref={gRef}>
                            <rect
                                x={-3000} y={-3000}
                                width={(layout?.width || 2000) + 6000}
                                height={(layout?.height || 2000) + 6000}
                                fill="url(#dots)"
                            />
                            {/* โซนเควสเดี่ยว (ไม่มีสายเชื่อมกับใคร) */}
                            {looseTop != null && (
                                <>
                                    <line
                                        x1={0} y1={looseTop - 70} x2={layout?.width || 0} y2={looseTop - 70}
                                        stroke="#54688f" strokeWidth={2} strokeDasharray="10 8"
                                    />
                                    <text x={0} y={looseTop - 26} fill="#8ba1c6" fontSize={24} fontWeight={800}
                                        style={{ textTransform: 'uppercase', letterSpacing: '.08em' }}>
                                        Standalone quests ({looseCount}) — no prerequisites, no follow-ups
                                    </text>
                                </>
                            )}

                            {/* เส้นเชื่อม */}
                            {edges.map((edge, i) => {
                                const source = nodeById.get(edge.source);
                                const target = nodeById.get(edge.target);
                                if (!source || !target) return null;
                                const onPath = focus && focus.all.has(edge.source) && focus.all.has(edge.target);
                                const dimmed = focus && !onPath;
                                const x1 = source.x + NODE_W / 2;
                                const x2 = target.x - NODE_W / 2;
                                const mid = (x1 + x2) / 2;
                                return (
                                    <path
                                        key={`e-${i}`}
                                        className="edge-path"
                                        // เส้นโค้งแบบขั้นบันได อ่านง่ายกว่าเส้นตรงทับกันมั่ว
                                        d={`M ${x1} ${source.y} C ${mid} ${source.y}, ${mid} ${target.y}, ${x2} ${target.y}`}
                                        fill="none"
                                        markerEnd={onPath ? "url(#arrowHot)" : "url(#arrow)"}
                                        stroke={onPath ? P.gold : edge.kind === 'failed' ? '#f87171' : '#5e739b'}
                                        strokeWidth={onPath ? 3 : 1.8}
                                        strokeDasharray={edge.kind === 'complete' ? undefined : '6 5'}
                                        opacity={dimmed ? 0.18 : 1}
                                    />
                                );
                            })}

                            {/* โหนด */}
                            {nodes.map(node => {
                                const state = stateOf(node);
                                const skin = NODE_STATE[state];
                                const trader = TRADER_THEMES[node.trader.name] || { bg: '#334155' };
                                const isHit = searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase());
                                const isSelected = selectedQuest?.id === node.id;
                                const dimmed = focus && !focus.all.has(node.id);

                                return (
                                    <g
                                        key={node.id}
                                        transform={`translate(${node.x - NODE_W / 2}, ${node.y - NODE_H / 2})`}
                                        opacity={dimmed ? 0.22 : 1}
                                        onClick={() => setSelectedQuest(isSelected ? null : node)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <rect
                                            width={NODE_W} height={NODE_H} rx={12}
                                            fill={skin.fill}
                                            stroke={isSelected ? P.gold : isHit ? '#fbbf24' : skin.stroke}
                                            strokeWidth={isSelected ? 3 : isHit ? 2.5 : 1.5}
                                            style={{ filter: isSelected ? `drop-shadow(0 0 14px ${P.gold}66)` : 'none' }}
                                        />
                                        {/* แถบสีเทรดเดอร์ด้านซ้าย */}
                                        <rect x={0} y={0} width={5} height={NODE_H} fill={trader.bg}
                                            style={{ clipPath: 'inset(0 0 0 0 round 12px 0 0 12px)' }} />

                                        <text x={18} y={28} fill={skin.text} fontSize={13.5} fontWeight={700} pointerEvents="none">
                                            {node.name.length > 27 ? node.name.slice(0, 25) + '…' : node.name}
                                        </text>
                                        <text x={18} y={48} fill={skin.sub} fontSize={10.5} fontWeight={700}
                                            pointerEvents="none" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                            {node.trader.name}{node.minPlayerLevel > 1 ? ` · LV ${node.minPlayerLevel}` : ''}
                                        </text>

                                        {/* แถบสถานะล่าง — อ่านออกแม้ซูมออกไกล */}
                                        <rect x={18} y={58} width={NODE_W - 52} height={4} rx={2} fill="#0d1526" opacity={0.45} />
                                        <rect x={18} y={58} width={(NODE_W - 52) * (state === 'done' ? 1 : state === 'active' ? 0.5 : 0)}
                                            height={4} rx={2} fill={state === 'done' ? '#34d399' : P.gold} />

                                        {node.kappaRequired && (
                                            <circle cx={NODE_W - 18} cy={26} r={5} fill={P.gold} />
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}

                {/* ---------------- legend ---------------- */}
                <div style={{
                    ...card, position: 'absolute', left: 16, bottom: 16, padding: '12px 14px',
                    zIndex: 10, maxWidth: 260,
                }}>
                    <div style={{ ...label, marginBottom: 8 }}>Legend</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {[
                            ['done', `Done (${stats.done})`],
                            ['active', `In progress (${stats.active})`],
                            ['ready', `Ready (${stats.ready})`],
                            ['blocked', `Blocked (${stats.blocked})`],
                        ].map(([k, text]) => (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: P.muted }}>
                                <span style={{
                                    width: 12, height: 12, borderRadius: 4,
                                    background: NODE_STATE[k].fill, border: `1.5px solid ${NODE_STATE[k].stroke}`,
                                }} />
                                {text}
                            </div>
                        ))}
                    </div>
                    <div style={{ height: 1, background: P.borderSoft, margin: '10px 0' }} />
                    <div style={{ display: 'grid', gap: 5, fontSize: 11, color: P.dim }}>
                        <div>— solid: must complete first</div>
                        <div>– – dashed: unlocks while previous is active</div>
                        <div style={{ color: '#b45b5b' }}>– – red: previous must be failed</div>
                        <div style={{ color: P.gold }}>● gold dot: required for Kappa</div>
                    </div>
                </div>

            {/* ---------------- แผงรายละเอียด ---------------- */}
            {selectedQuest && (
                <aside style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 360, maxWidth: '100%',
                    background: 'linear-gradient(180deg,#101b31 0%,#0b1426 100%)',
                    borderLeft: `1px solid ${P.border}`,
                    overflowY: 'auto', zIndex: 25, padding: 16,
                    boxShadow: '-12px 0 30px rgba(0,0,0,.45)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{
                            width: 5, height: 26, borderRadius: 3,
                            background: TRADER_THEMES[selectedQuest.trader.name]?.bg || '#334155',
                        }} />
                        <h2 style={{ flex: 1, fontSize: '16px', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                            {selectedQuest.name}
                        </h2>
                        <button
                            onClick={() => setSelectedQuest(null)} title="Close"
                            style={{ background: 'none', border: 'none', color: P.dim, cursor: 'pointer', display: 'flex' }}
                        >
                            <Icons.Close size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <span style={badge(TRADER_THEMES[selectedQuest.trader.name]?.bg || P.label)}>
                            {selectedQuest.trader.name}
                        </span>
                        {selectedQuest.minPlayerLevel > 1 && <span style={badge(P.label)}>LV {selectedQuest.minPlayerLevel}</span>}
                        <span style={badge(P.blue)}>{selectedQuest.experience.toLocaleString()} XP</span>
                        {selectedQuest.kappaRequired && <span style={badge(P.gold)}>Kappa</span>}
                        {selectedQuest.lightkeeperRequired && <span style={badge('#38bdf8')}>Lightkeeper</span>}
                    </div>

                    {selectedQuest.taskImageLink && (
                        <img
                            src={selectedQuest.taskImageLink} alt=""
                            style={{ width: '100%', borderRadius: 10, marginBottom: 14, border: `1px solid ${P.borderSoft}` }}
                        />
                    )}

                    <button
                        onClick={() => onQuetsSccess(selectedQuest)}
                        disabled={doneSet.has(selectedQuest.id)}
                        style={{
                            width: '100%', padding: '10px', borderRadius: 10, marginBottom: 16,
                            fontSize: 13, fontWeight: 800, cursor: doneSet.has(selectedQuest.id) ? 'default' : 'pointer',
                            border: `1px solid ${doneSet.has(selectedQuest.id) ? '#1f6f4a' : P.green}`,
                            background: doneSet.has(selectedQuest.id) ? '#10281c' : `${P.green}22`,
                            color: doneSet.has(selectedQuest.id) ? '#6ee7a8' : P.green,
                        }}
                    >
                        {doneSet.has(selectedQuest.id) ? '✓ Completed' : 'Mark as complete'}
                    </button>

                    <div style={{ ...label, marginBottom: 7 }}>Objectives ({selectedQuest.objectives.length})</div>
                    <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                        {selectedQuest.objectives.map((obj, i) => (
                            <li key={i} style={{
                                fontSize: 12.5, color: P.muted, lineHeight: 1.5,
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

                    {/* เดินสายต่อได้จากตรงนี้เลย ไม่ต้องไปไล่หาในผัง */}
                    {focus && [
                        { title: `Unlocked by (${focus.ancestors.size})`, ids: [...focus.ancestors] },
                        { title: `Leads to (${focus.descendants.size})`, ids: [...focus.descendants] },
                    ].map(({ title, ids }) => ids.length > 0 && (
                        <div key={title} style={{ marginBottom: 14 }}>
                            <div style={{ ...label, marginBottom: 7 }}>{title}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {ids.slice(0, 24).map(id => {
                                    const n = nodeById.get(id);
                                    if (!n) return null;
                                    return (
                                        <span
                                            key={id}
                                            onClick={() => focusNode(id)}
                                            style={{ ...badge(doneSet.has(id) ? P.green : P.label), cursor: 'pointer' }}
                                            title="Show in tree"
                                        >
                                            {n.name}
                                        </span>
                                    );
                                })}
                                {ids.length > 24 && <span style={badge(P.dim)}>+{ids.length - 24} more</span>}
                            </div>
                        </div>
                    ))}

                    <div style={{ borderTop: `1px solid ${P.borderSoft}`, paddingTop: 12 }}>
                        <a
                            href={selectedQuest.wikiLink} target="_blank" rel="noreferrer"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                color: P.blue, textDecoration: 'none', fontSize: 12.5, fontWeight: 700,
                            }}
                        >
                            Open on Wiki <Icons.ExternalLink size={13} />
                        </a>
                    </div>
                </aside>
            )}
            </div>

            {/* แถบความคืบหน้ารวม อยู่ล่างสุดให้เห็นตลอด */}
            <div style={{
                borderTop: `1px solid ${P.border}`, background: '#0b1222',
                padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
                <span style={label}>Overall</span>
                <div style={{ flex: 1, maxWidth: 420 }}>
                    <Bar value={stats.done} total={nodes.length} color={P.green} />
                </div>
                <span style={{ ...label, fontVariantNumeric: 'tabular-nums' }}>
                    {stats.done} / {nodes.length} done
                </span>
            </div>
        </div>
    );
};

export default QuestTree;
