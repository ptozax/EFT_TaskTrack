import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Tesseract from "tesseract.js";
import questsStatic from "../data/tasks";
import { useLiveData } from '../data/gameStore';
import * as QuestComponent from '../Component/QuestComponent';
import { Icons, TRADER_THEMES } from '../Component/EftComponent';
import { P, card, badge, label, SearchBox, Empty, TraderChip } from '../Component/PanelUI.jsx';

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_KEY = "eft_objective_checklist";
const COMPLETE_KEY = "eft_completed_quests";

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

/* โหมดปลายทางของการเพิ่มเควส */
const MODES = [
  { key: 'current', text: 'Active quests', hint: 'Add to "In Progress" list (Home page)', color: '#eab308' },
  { key: 'done', text: 'Completed', hint: 'Mark as complete (including all preceding quests in the chain)', color: '#22c55e' },
];

const AddQuest = () => {
  const quests = useLiveData(questsStatic, 'tasks'); // สดจาก tarkov.dev ถ้าโหลดเสร็จ ไม่งั้น static

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState('current');
  // อ่านจาก localStorage ตั้งแต่ตอน init ไม่ต้องรอ effect — ของเดิมเริ่มด้วย [] แล้วค่อยเติม
  // ทำให้เห็นกล่อง "No quests added yet" แว้บหนึ่งทุกครั้งที่เข้าหน้า
  const [selectedQuests, setSelectedQuests] = useState(() => readJSON(STORAGE_KEY, []));
  const [completedIds, setCompletedIds] = useState(() => new Set(readJSON(COMPLETE_KEY, []).map((q) => q.id)));
  const [selectedTraders, setSelectedTraders] = useState([]);

  // OCR
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [ocrMatchedQuests, setOcrMatchedQuests] = useState(null);   // null = ยังไม่เคยสแกน
  const [ocrUnmatchedText, setOcrUnmatchedText] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const modeRef = useRef(mode);
  const fileRef = useRef(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const loadSelected = useCallback(() => {
    setSelectedQuests(readJSON(STORAGE_KEY, []));
    setCompletedIds(new Set(readJSON(COMPLETE_KEY, []).map((q) => q.id)));
  }, []);

  useEffect(() => { loadSelected(); }, [loadSelected]);

  /* ---------------- เพิ่ม / เอาออก ---------------- */
  const addQuest = useCallback((quest) => {
    if (modeRef.current === 'current') {
      const saved = readJSON(STORAGE_KEY, []);
      if (saved.some((q) => q.id === quest.id)) return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved, quest]));
    } else {
      const completed = readJSON(COMPLETE_KEY, []);
      const newCompleted = QuestComponent.getPreviousQuestsList(quest.id, completed);
      if (newCompleted.length === 0) return false;
      const byId = new Map(completed.map((q) => [q.id, q]));
      newCompleted.forEach((q) => byId.set(q.id, q));
      localStorage.setItem(COMPLETE_KEY, JSON.stringify([...byId.values()]));
      // เควสที่เพิ่งปิดไปต้องหลุดจากรายการ "กำลังทำ" ด้วย ไม่งั้นหน้า Home ยังโชว์ค้างอยู่
      QuestComponent.dropFromActive(newCompleted.map((q) => q.id));
    }
    loadSelected();
    return true;
  }, [loadSelected]);

  const removeQuest = (questId) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readJSON(STORAGE_KEY, []).filter((q) => q.id !== questId)));
    const objectives = readJSON(OBJECTIVE_KEY, {});
    Object.keys(objectives).forEach((k) => { if (k.startsWith(`${questId}|`)) delete objectives[k]; });
    localStorage.setItem(OBJECTIVE_KEY, JSON.stringify(objectives));
    loadSelected();
  };

  /* ---------------- OCR ---------------- */
  const autoMatchQuest = useCallback((text) => {
    const matched = [];
    let remaining = text.toLowerCase();
    /* กรองฝ่ายก่อน — Textile / Drip-Out / Our Own Land / Green Corridor มีทั้งเวอร์ชัน
       BEAR และ USEC ชื่อเหมือนกันเป๊ะ ถ้าไม่กรอง ตัวที่โดนหยิบขึ้นกับลำดับในข้อมูล
       ผู้เล่น USEC จึงได้เควสฝั่ง BEAR เข้ารายการ */
    quests
      .filter((q) => QuestComponent.inFaction(q))
      // เรียงชื่อยาวก่อน กัน "Debut" ไปกินคำใน "Debut - Part 2"
      .sort((a, b) => b.name.length - a.name.length).forEach((quest) => {
      const qName = quest.name.toLowerCase();
      if (!remaining.includes(qName)) return;
      const added = addQuest(quest);
      matched.push({ name: quest.name, trader: quest.trader?.name, added });
      remaining = remaining.replaceAll(qName, " ");
    });
    setOcrMatchedQuests(matched);
    setOcrUnmatchedText(remaining.replace(/\s+/g, ' ').trim());
  }, [quests, addQuest]);

  const scanImage = useCallback(async (file) => {
    setLoading(true);
    setOcrProgress(0);
    setOcrMatchedQuests(null);
    setOcrUnmatchedText("");
    setPreview(URL.createObjectURL(file));
    try {
      const { data } = await Tesseract.recognize(file, "eng", {
        logger: (m) => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); },
      });
      autoMatchQuest(data.text);
    } catch (err) {
      console.error(err);
      setOcrMatchedQuests([]);
    } finally {
      setLoading(false);
    }
  }, [autoMatchQuest]);

  // วางรูปด้วย Ctrl+V ได้เหมือนเดิม
  useEffect(() => {
    const handlePaste = (e) => {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.includes("image")) {
          const file = item.getAsFile();
          if (file) scanImage(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [scanImage]);

  /* ---------------- รายการ ---------------- */
  // 12 เควสแยกฝ่าย BEAR/USEC (Drip-Out, Textile, Our Own Land/Counteraction, Green Corridor/Road Closed)
  // ไม่กรองแล้วจะเห็นชื่อซ้ำกันสองอันและเผลอเพิ่มของฝ่ายตรงข้าม — ฝ่ายสลับได้ที่ AppNavbar
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
    return quests
      .filter((q) => QuestComponent.inFaction(q) && q.name.toLowerCase().includes(term))
      .slice(0, 14);
  }, [search, quests]);

  const traderOptions = useMemo(
    () => [...new Set(selectedQuests.map((q) => q.trader?.name).filter(Boolean))].sort(),
    [selectedQuests]
  );

  /* อ่านทีเดียวตอน mount ก็พอ — แก้ LL ได้ที่หน้า Home เท่านั้น
     ซึ่งต้องเปลี่ยนหน้ามา หน้านี้เลยเกิดใหม่พร้อมค่าล่าสุดอยู่แล้ว */
  const traderLevels = useMemo(() => QuestComponent.getTraderLevels(), []);

  const visibleSelected = selectedTraders.length === 0
    ? selectedQuests
    : selectedQuests.filter((q) => selectedTraders.includes(q.trader?.name));

  const activeIds = useMemo(() => new Set(selectedQuests.map((q) => q.id)), [selectedQuests]);
  const modeMeta = MODES.find((m) => m.key === mode);

  return (
    <div style={{ background: P.bg, minHeight: '100vh', color: P.text }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '22px 20px 64px' }}>

        <h1 style={{ fontSize: 23, fontWeight: 900, margin: '0 0 4px' }}>Add Quest</h1>
        <div style={{ ...label, marginBottom: 18 }}>
          Add quests by name, or scan a screenshot of your in-game task list
        </div>

        {/* ---------------- โหมดปลายทาง ---------------- */}
        <div style={{ ...card, padding: 12, marginBottom: 16 }}>
          <div style={{ ...label, marginBottom: 9 }}>Add to</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  flex: '1 1 220px', textAlign: 'left', padding: '10px 13px', borderRadius: 11,
                  cursor: 'pointer', transition: 'all .15s ease',
                  border: `1px solid ${mode === m.key ? m.color : '#2a3550'}`,
                  background: mode === m.key ? `${m.color}1c` : P.inputBg,
                }}
              >
                <div style={{ fontSize: 15.5, fontWeight: 800, color: mode === m.key ? m.color : P.muted }}>
                  {m.text}
                </div>
                <div style={{ fontSize: 13.5, color: P.dim, marginTop: 3 }}>{m.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- ค้นหา ---------------- */}
        <div style={{ marginBottom: 12 }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search quest name..." />
        </div>

        {search.trim() && (
          <div style={{ ...card, padding: 8, marginBottom: 16, maxHeight: 340, overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <div style={{ ...label, padding: '8px 6px' }}>No quest found</div>
            ) : searchResults.map((q) => {
              const already = mode === 'current' ? activeIds.has(q.id) : completedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => !already && addQuest(q)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px',
                    borderRadius: 8, cursor: already ? 'default' : 'pointer', opacity: already ? .5 : 1,
                  }}
                >
                  <span style={{
                    width: 4, height: 18, borderRadius: 2, flexShrink: 0,
                    background: TRADER_THEMES[q.trader?.name]?.bg || '#334155',
                  }} />
                  <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600 }}>{q.name}</span>
                  <span style={label}>{q.trader?.name}</span>
                  {q.minPlayerLevel > 1 && <span style={badge(P.label)}>LV {q.minPlayerLevel}</span>}
                  <span style={badge(already ? P.dim : modeMeta.color)}>{already ? 'Added' : '+ Add'}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- สแกนรูป ---------------- */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith('image/')) scanImage(file);
          }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? P.gold : P.border}`,
            background: dragOver ? `${P.gold}12` : 'rgba(14,23,48,.6)',
            borderRadius: 14, padding: '26px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'all .15s ease', marginBottom: 16,
          }}
        >
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) scanImage(f); e.target.value = ''; }}
          />
          <div style={{ color: dragOver ? P.gold : P.dim, display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Icons.Crosshair size={30} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.muted }}>
            Scan quests from a screenshot
          </div>
          <div style={{ fontSize: 14, color: P.dim, marginTop: 6 }}>
            Drop an image here, click to choose a file, or press Ctrl + V to paste
          </div>

          {loading && (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...label, color: P.gold, marginBottom: 6 }}>
                Reading image… {ocrProgress}%
              </div>
              <div style={{ width: '100%', maxWidth: 320, margin: '0 auto', height: 5, background: '#1b2742', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${ocrProgress}%`, height: '100%', background: P.gold, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          {preview && !loading && (
            <img
              src={preview} alt="scanned"
              style={{
                maxHeight: 150, maxWidth: '100%', marginTop: 14, borderRadius: 10,
                border: `1px solid ${P.borderSoft}`,
              }}
            />
          )}
        </div>

        {/* ---------------- ผล OCR ---------------- */}
        {ocrMatchedQuests !== null && !loading && (
          <div style={{ ...card, padding: 14, marginBottom: 16 }}>
            {ocrMatchedQuests.length > 0 ? (
              <>
                <div style={{ ...label, color: P.green, marginBottom: 9 }}>
                  Matched {ocrMatchedQuests.length} quest{ocrMatchedQuests.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ocrMatchedQuests.map((m) => (
                    <span key={m.name} style={badge(m.added ? P.green : P.dim)}>
                      {m.name}{m.added ? '' : ' · already there'}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ ...label, color: P.red }}>
                No quest matched — try a clearer screenshot, or add by name above
              </div>
            )}

            {ocrUnmatchedText && (
              <details style={{ marginTop: 14 }}>
                <summary style={{ ...label, cursor: 'pointer' }}>Unrecognised text</summary>
                <pre style={{
                  whiteSpace: 'pre-wrap', fontSize: 13.5, color: P.dim, marginTop: 8,
                  background: P.inputBg, border: `1px solid ${P.borderSoft}`,
                  borderRadius: 9, padding: 10, maxHeight: 180, overflowY: 'auto',
                }}>
                  {ocrUnmatchedText}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* ---------------- เควสที่อยู่ในรายการแล้ว ---------------- */}
        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={label}>Active quests ({selectedQuests.length})</span>
            <div style={{ flex: 1 }} />
            {traderOptions.map((t) => (
              <TraderChip
                key={t}
                name={t}
                level={traderLevels[t] ?? 1}
                active={selectedTraders.includes(t)}
                onClick={() => setSelectedTraders((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}
              />
            ))}
          </div>

          {selectedQuests.length === 0 ? (
            <Empty icon={<Icons.Book size={36} />} title="No quests added yet" />
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {visibleSelected.map((quest) => (
                <div
                  key={quest.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                    borderRadius: 9, background: P.inputBg, border: `1px solid ${P.borderSoft}`,
                  }}
                >
                  <span style={{
                    width: 4, height: 20, borderRadius: 2, flexShrink: 0,
                    background: TRADER_THEMES[quest.trader?.name]?.bg || '#334155',
                  }} />
                  <a
                    href={quest.wikiLink} target="_blank" rel="noreferrer"
                    style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, color: P.text, textDecoration: 'none' }}
                  >
                    {quest.name}
                  </a>
                  <span style={label}>{quest.trader?.name}</span>
                  <button
                    title="Remove"
                    onClick={() => removeQuest(quest.id)}
                    style={{
                      width: 26, height: 26, flexShrink: 0, borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${P.red}55`, background: `${P.red}18`, color: P.red,
                    }}
                  >
                    <Icons.Close size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddQuest;
