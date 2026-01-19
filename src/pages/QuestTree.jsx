import React, { useState, useEffect, useMemo, useRef } from 'react';
import tasks from "../data/tasks";
import * as d3 from 'd3';
import dagre from 'dagre';
import { div, li } from 'framer-motion/client';
import styles2 from '../Component/MapComponents';
import * as QuestComponent from '../Component/QuestComponent';

import Button from 'react-bootstrap/Button';

const COMPLETE_KEY = "eft_completed_quests";
const STORAGE_KEY = "eft_selected_quests";

const TRADER_THEMES = {
    "Prapor": { bg: "#7b1fa2", border: "#e1bee7", text: "#ffffff" }, // ม่วงสด
    "Therapist": { bg: "#0288d1", border: "#81d4fa", text: "#ffffff" }, // ฟ้าสด
    "Skier": { bg: "#f57c00", border: "#ffe0b2", text: "#ffffff" }, // ส้มสด
    "Peacekeeper": { bg: "#2e7d32", border: "#a5d6a7", text: "#ffffff" }, // เขียวเข้มทหาร
    "Mechanic": { bg: "#D34E4E", border: "#ffcdd2", text: "#ffffff" }, // แดงชมพู (ตามที่คุณชอบแต่สดขึ้น)
    "Ragman": { bg: "#c2185b", border: "#f8bbd0", text: "#ffffff" }, // ชมพูบานเย็น
    "Jaeger": { bg: "#689f38", border: "#dcedc8", text: "#ffffff" }, // เขียวสว่าง
    "Fence": { bg: "#5d4037", border: "#d7ccc8", text: "#ffffff" }, // น้ำตาลเข้ม
    "Lightkeeper": { bg: "#ffea00ff", border: "#f57f17", text: "#000000" }, // เหลืองทองสว่าง (Text ดำ)
    "BTR Driver": { bg: "#ffeb3b", border: "#212121", text: "#000000" }, // เหลือง Taxi/Hazard (เด่นที่สุด)
    "Ref": { bg: "#d32f2f", border: "#ffcdd2", text: "#ffffff" }, // แดงสด Arena
};

const QuestTree = () => {
    const [selectedTrader, setSelectedTrader] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const svgRef = useRef(null);
    const gRef = useRef(null);

    const [selectedQuest, setSelectedQuest] = useState(null);


    const [passedQuest, setPassedQuest] = useState([]);
    const [completeQuest, setCompleteQuest] = useState(() => {
        return JSON.parse(localStorage.getItem(COMPLETE_KEY)) || [];
    });
    const [curentQuest, setCurentQuest] = useState(() => {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    });
    const [isLoad, setIsLoad] = useState(false);

    const zoomRef = useRef(null);



    function getCompletedQuests(quests, currentQuests) {
        const questMap = Object.fromEntries(
            quests.map(q => [q.id, q])
        );

        const completed = new Set();

        function dfs(id) {
            const quest = questMap[id];
            if (!quest) return;

            for (const req of quest.taskRequirements) {
                if (!completed.has(req.task.id)) {
                    if (req.status.some(s => ["active",].includes(s))) {
                        const tarketActiveTask = tasks.filter(t => t.id == req.task.id);
                        tarketActiveTask.forEach(maintask => {
                            maintask.taskRequirements?.forEach(require => {
                                completed.add(require.task.id);
                                dfs(require.task.id);
                            });
                        });
                    }
                    else if (req.status.some(s => ["complete", "failed"].includes(s))) {
                        completed.add(req.task.id);
                        dfs(req.task.id);
                    }
                }
            }
        }

        currentQuests.forEach(dfs);
        return [...completed];
    }


    const onQuetsSccess = (successQuest) => {
        let passQuest = QuestComponent.getPreviousQuestsList(successQuest.id, JSON.parse(localStorage.getItem(COMPLETE_KEY)))
        const idsToRemove = new Set(passQuest.map(u => u.id));
        idsToRemove.add(successQuest.id);

        setCompleteQuest([...new Set([...completeQuest, ...passQuest])])

        const nextCurrentQuest = curentQuest.filter(q => !Array.from(idsToRemove).includes(q.id));
        const nextquest = QuestComponent.getNextQuestLists([...new Set([...completeQuest, ...passQuest])], successQuest.id);

        setCurentQuest([...new Set([...nextCurrentQuest, ...nextquest])]);

    }


    useEffect(() => {
        setIsLoad(true);
        const handleStorageChange = () => {
            try {
                console.log("Storage changed detected! at Quest Tree");
                const completedQuests = JSON.parse(localStorage.getItem(COMPLETE_KEY)) || [];
                // let completedQuestsIds = completedQuests.map(q => q.id);

                const curentQuests = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
                // let curentQuestIds =curentQuests.map(q => q.id);

                // let passQuest = getCompletedQuests(tasks, curentQuestIds)

                // [] + []  ไม่ซ้ำ
                // const result = [...new Set([...completedQuestsIds, ...passQuest])];
                // setPassedQuest(result);
                setCompleteQuest(completedQuests);
                setCurentQuest(curentQuests)
            } catch (err) {
                console.error(err);
            }
        };
        QuestComponent.callbackStorageChange(handleStorageChange);
    }, []);

    useEffect(() => {
        if (isLoad) {
            localStorage.setItem(COMPLETE_KEY, JSON.stringify(completeQuest));



            let completedQuestsIds = completeQuest.map(q => q.id);
            let curentQuestIds = curentQuest.map(q => q.id);
            let passQuest = getCompletedQuests(tasks, curentQuestIds)
            // [] + []  ไม่ซ้ำ
            const result = [...new Set([...completedQuestsIds, ...passQuest])];
            setPassedQuest(result);




        }
    }, [completeQuest, isLoad])




    useEffect(() => {
        if (isLoad) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(curentQuest));
        }
    }, [curentQuest])

    // ตรรกะการประมวลผลกราฟ
    const { nodes, edges, layout } = useMemo(() => {
        if (!tasks.length) return { nodes: [], edges: [], layout: null };

        // 1. ระบุ Node ที่ต้องการแสดง (กรองตาม Trader หรือค้นหา)
        let initialFiltered = tasks;
        if (selectedTrader !== "All") {
            initialFiltered = tasks.filter(t => t.trader.name === selectedTrader);
        }

        // สร้าง Set ของ ID ที่จะแสดง (รวม Prerequisites ทั้งสาย)
        const visibleIds = new Set();

        const addWithPrereqs = (task) => {
            if (!task || visibleIds.has(task.id)) return;
            visibleIds.add(task.id);
            task.taskRequirements?.forEach(req => {
                const prereqTask = tasks.find(t => t.id === req.task.id);
                if (prereqTask) addWithPrereqs(prereqTask);
            });
        };

        initialFiltered.forEach(task => addWithPrereqs(task));

        // กรณี Search ให้เพิ่มเควสที่ตรงกับคำค้นหาด้วย
        if (searchTerm) {
            tasks.forEach(task => {
                if (task.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    addWithPrereqs(task);
                }
            });
        }

        const finalTasks = tasks.filter(t => visibleIds.has(t.id));

        // 2. ตั้งค่า Dagre Layout
        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 160 });
        g.setDefaultEdgeLabel(() => ({}));

        finalTasks.forEach(t => {
            g.setNode(t.id, { width: 240, height: 70 });
        });

        const edgeData = [];
        finalTasks.forEach(t => {
            t.taskRequirements?.forEach(req => {
                if (visibleIds.has(req.task.id)) {
                    if (req.status.some(s => ["active",].includes(s))) {
                        const tarketActiveTask = tasks.filter(t => t.id == req.task.id);
                        tarketActiveTask.forEach(maintask => {
                            maintask.taskRequirements?.forEach(require => {
                                edgeData.push({ source: require.task.id, target: t.id });
                                g.setEdge(require.task.id, t.id);
                            });
                        });
                    }
                    else if (req.status.some(s => ["complete", "failed"].includes(s))) {
                        g.setEdge(req.task.id, t.id);
                        edgeData.push({ source: req.task.id, target: t.id });
                    }
                }
            });
        });

        dagre.layout(g);

        const positionedNodes = finalTasks.map(t => {
            const nodePos = g.node(t.id);
            return {
                ...t,
                x: nodePos.x,
                y: nodePos.y
            };
        });

        return { nodes: positionedNodes, edges: edgeData, layout: g.graph() };
    }, [tasks, selectedTrader, searchTerm, passedQuest]);

    // D3 Zoom & Pan
    useEffect(() => {
        if (!svgRef.current || !nodes.length) return;

        const svg = d3.select(svgRef.current);
        const g = d3.select(gRef.current);

        const zoom = d3.zoom()
            .scaleExtent([0.02, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);
        zoomRef.current = zoom; // 👈 เก็บไว้ใช้ตอน search

        // Fit view ตอนโหลด
        if (layout) {
            const padding = 50;
            const fullWidth = svgRef.current.clientWidth;
            const fullHeight = svgRef.current.clientHeight;

            const scale = Math.min(
                (fullWidth - padding) / layout.width,
                (fullHeight - padding) / layout.height,
                0.8
            );

            const transform = d3.zoomIdentity
                .translate(
                    fullWidth / 2 - (layout.width / 2) * scale,
                    fullHeight / 2 - (layout.height / 2) * scale
                )
                .scale(scale);

            svg.transition().duration(750).call(zoom.transform, transform);
        }
    }, [nodes, layout]);






    useEffect(() => {
        if (!searchTerm || !nodes.length || !svgRef.current) return;

        const match = nodes.find(n =>
            n.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (!match) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const scale = 1.2; // ระดับ zoom (ปรับได้)
        const transform = d3.zoomIdentity
            .translate(
                width / 2 - match.x * scale,
                height / 2 - match.y * scale
            )
            .scale(scale);

        svg
            .transition()
            .duration(750)
            .call(zoomRef.current.transform, transform);
    }, [searchTerm, nodes]);









    const traders = ["All", ...new Set(tasks.map(t => t.trader.name))];

    const styles = {
        wrapper: {
            display: 'flex',
            flexDirection: 'column',
            height: '93vh',
            overflow: 'hidden',
        },
        header: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'row', // Note: You may need a media query for mobile column
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 20,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        },
        logoBox: {
            backgroundColor: '#eab308', // yellow-500
            padding: '8px',
            borderRadius: '8px',
            color: 'black',
            fontWeight: 900,
            fontSize: '1.25rem',
            boxShadow: '0 10px 15px -3px rgba(234, 179, 8, 0.2)',
        },
        selectWrapper: {
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        },
        input: {
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '0.875rem',
            outline: 'none',
            width: '256px',
            color: '#e2e8f0',
            transition: 'all 0.3s',
        },
        graphContainer: {
            flex: 1,
            backgroundColor: '#0b0f1a',
            position: 'relative',
        },
        loaderOverlay: {
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(2, 6, 23, 0.5)',
        },
        legend: {
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            padding: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
            maxWidth: '200px',
            zIndex: 20,
        }






    };

    return (
        <div style={styles.wrapper}>
            {/* UI Header */}
            <header style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>Quest Explorer</h1>

                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={styles.selectWrapper}>
                        <span style={{ paddingLeft: '12px', paddingRight: '4px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Trader</span>
                        <select
                            style={{ backgroundColor: 'transparent', fontSize: '0.875rem', border: 'none', outline: 'none', padding: '4px 8px', cursor: 'pointer', fontWeight: 500, color: '#e2e8f0' }}
                            value={selectedTrader}
                            onChange={(e) => setSelectedTrader(e.target.value)}
                        >
                            {traders.map(t => <option key={t} value={t} style={{ backgroundColor: '#1e293b' }}>{t}</option>)}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อเควส..."
                            style={styles.input}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* กราฟ SVG Container */}
            <div style={styles.graphContainer}>
                {tasks.length === 0 ? (
                    <div style={styles.loaderOverlay}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', border: '4px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin"></div>
                            <p style={{ color: '#94a3b8', fontWeight: 500 }}>กำลังโหลดข้อมูลเควส...</p>
                        </div>
                    </div>
                ) : (
                    <svg ref={svgRef} style={{ width: '100%', height: '100%' }} className="zoom-container">
                        <defs>
                            <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#334155" />
                            </marker>

                            <linearGradient
                                id="rainbowStrokeAnimated"
                                gradientUnits="userSpaceOnUse"
                                x1="0"
                                y1="0"
                                x2="240"
                                y2="0"
                            >
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="20%" stopColor="#f97316" />
                                <stop offset="40%" stopColor="#facc15" />
                                <stop offset="60%" stopColor="#22c55e" />
                                <stop offset="80%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#a855f7" />

                                {/* animation */}
                                <animate
                                    attributeName="x1"
                                    from="0"
                                    to="240"
                                    dur="3s"
                                    repeatCount="indefinite"
                                />
                                <animate
                                    attributeName="x2"
                                    from="240"
                                    to="480"
                                    dur="3s"
                                    repeatCount="indefinite"
                                />
                            </linearGradient>


                        </defs>
                        <g ref={gRef}>
                            {/* วาดเส้นเชื่อม (Edges) */}
                            {edges.map((edge, i) => {
                                const source = nodes.find(n => n.id === edge.source);
                                const target = nodes.find(n => n.id === edge.target);
                                if (!source || !target) return null;

                                return (
                                    <path
                                        key={`e-${i}`}
                                        className="edge-path"
                                        d={`M ${source.x + 120} ${source.y} L ${target.x - 120} ${target.y}`}
                                        markerEnd="url(#arrow)"
                                    />
                                );
                            })}

                            {/* วาดโหนด (Nodes) */}
                            {nodes.map(node => {
                                const theme = TRADER_THEMES[node.trader.name] || { bg: "#1e293b", border: "#334155", text: "#f8fafc" };
                                const isHighlight = searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase());
                                const isSelectedTraderNode = selectedTrader !== "All" && node.trader.name === selectedTrader;

                                return (
                                    <g key={node.id} transform={`translate(${node.x - 120}, ${node.y - 35})`}>
                                        <rect
                                            width="240"
                                            height="70"
                                            rx="12"
                                            fill={passedQuest.includes(node.id) ? "#1e293b" : theme.bg}
                                            stroke={curentQuest.map(q => q.id).includes(node.id) ? "url(#rainbowStrokeAnimated)" : isHighlight ? "#fbbf24" : isSelectedTraderNode ? "#fff" : theme.border}
                                            strokeWidth={curentQuest.map(q => q.id).includes(node.id) ? "10" : isHighlight ? "4" : (isSelectedTraderNode ? "2.5" : "1")}
                                            className="node-rect"
                                            style={{
                                                filter: isHighlight ? 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.4))' : 'none',
                                                opacity: (selectedTrader === "All" || isSelectedTraderNode || isHighlight || nodes.some(n => n.id === node.id)) ? 1 : 0.4
                                            }}


                                            onClick={() => setSelectedQuest(node)}

                                        />
                                        <text x="16" y="28" fill={theme.text} className="font-bold text-[13px] tracking-tight" pointerEvents="none">
                                            {node.name.length > 28 ? node.name.substring(0, 26) + '...' : node.name}
                                        </text>
                                        <text x="16" y="52" fill={theme.text} className="opacity-60 text-[10px] font-medium uppercase tracking-wider" pointerEvents="none">
                                            {node.trader.name} {node.minPlayerLevel > 1 ? `• LV.${node.minPlayerLevel}` : ''}
                                        </text>
                                        {node.kappaRequired && (
                                            <circle cx="220" cy="50" r="4" fill="#fbbf24" title="Kappa Required" pointerEvents="none" />
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}
            </div>





            <aside style={{
                ...styles2.sidebar,
                width: selectedQuest ? '25%' : '0%',
                padding: selectedQuest ? '24px' : '0',
                opacity: selectedQuest ? 1 : 0,
                marginTop: '70px',
                height: "86%",
                position: 'absolute'
            }}>

                {selectedQuest && (<>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <header style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 style={{ fontSize: '20px', fontWeight: '800' }}>🗺️ Quest Detail</h1>
                        </header>
                        <button
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            onClick={() => setSelectedQuest(null)}
                            title="Close Sidebar"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                    </div>



                    <div className="card  border-primary" style={{}}>
                        <img src={selectedQuest.taskImageLink} alt="" />
                        <div className="card-body">
                            <h5 className="card-title">{selectedQuest.name}</h5>
                            <Button variant="success" className='col-12' onClick={() => { onQuetsSccess(selectedQuest) }}>Complete</Button>
                            <div className="text-muted small mt-3 ">
                                {selectedQuest.trader.name} | EXP : {selectedQuest.experience}

                                {selectedQuest.kappaRequired && (
                                    <span className="badge rounded-pill bg-success ms-2">
                                        Kappa
                                    </span>
                                )}

                                {selectedQuest.lightkeeperRequired && (
                                    <span className="badge rounded-pill bg-info ms-1 ">
                                        LightKeeper
                                    </span>
                                )}
                            </div>


                            <ul>
                                {selectedQuest.objectives.map((obj, index) => (
                                    <li key={index}>
                                        <span>{obj.description}</span>  {["giveItem", "TaskObjectiveShoot", "shoot", "kill"].includes(obj.type) && <> <span className='text-info'>x {obj.count}</span> </>}
                                    </li>
                                ))}
                            </ul>

                            <div className='d-flex justify-content-end' style={{ marginTop: '10px' }}>
                                <a
                                    href={selectedQuest.wikiLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#60a5fa', textDecoration: 'none' }}
                                >
                                    Wiki ↗
                                </a>
                            </div>

                        </div>
                    </div>




                </>

                )}





            </aside>











            {/* Legend Panel */}
            {/* <div style={styles.legend}>
                <h4 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.2em' }}>Trader Guide</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {Object.entries(TRADER_THEMES).map(([name, theme]) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.bg }}></div>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#cbd5e1' }}>{name}</span>
                        </div>
                    ))}
                </div>
            </div> */}
        </div>
    );
};

export default QuestTree;
