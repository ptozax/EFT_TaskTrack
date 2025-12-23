import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import quests from "../data/tasks";

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_KEY = "eft_objective_checklist";

const AddQuest = () => {
  const [search, setSearch] = useState("");
  const [imageText, setImageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [ocrMatched, setOcrMatched] = useState(null);
  const [ocrMatchedQuests, setOcrMatchedQuests] = useState([]);
  const [ocrUnmatchedText, setOcrUnmatchedText] = useState("");
  const [selectedTraders, setSelectedTraders] = useState([]);




  const traderOptions = [
    ...new Set(
      selectedQuests
        .map((q) => q.trader?.name)
        .filter(Boolean)
    ),
  ];



  const filteredSelectedQuests =
    selectedTraders.length === 0
      ? selectedQuests
      : selectedQuests.filter((q) =>
        selectedTraders.includes(q.trader?.name)
      );

  const toggleTrader = (trader) => {
    setSelectedTraders((prev) =>
      prev.includes(trader)
        ? prev.filter((t) => t !== trader)
        : [...prev, trader]
    );
  };
  /* ---------------- LOAD SELECTED QUESTS ---------------- */
  useEffect(() => {
    loadSelected();
  }, []);

  const loadSelected = () => {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    setSelectedQuests(saved);
  };

  /* ---------------- SEARCH ---------------- */
  const filteredQuests = quests.filter((q) =>
    q.name.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- OCR ---------------- */
  const scanImage = async (image) => {
    setLoading(true);
    setOcrMatched(null);
    setOcrMatchedQuests([]);

    const { data } = await Tesseract.recognize(image, "eng");

    setImageText(data.text);
    autoMatchQuest(data.text);

    setLoading(false);
  };

  /* ---------------- PASTE (CTRL+V) ---------------- */
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.includes("image")) {
          const file = item.getAsFile();
          if (file) scanImage(file);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  /* ---------------- STORAGE ---------------- */
  const getSavedQuests = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  const addQuest = (quest) => {
    const saved = getSavedQuests();
    if (saved.some((q) => q.name === quest.name)) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...saved, quest])
    );

    loadSelected(); // 👈 refresh list
  };


  const removeQuest = (questName) => {
    // ลบ quest
    const saved = getSavedQuests().filter(
      (q) => q.name !== questName
    );

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(saved)
    );

    // 👇 ลบ objective progress ของ quest นี้
    clearObjectiveProgress(questName);

    loadSelected();
  };



  const clearObjectiveProgress = (questName) => {
    const saved =
      JSON.parse(localStorage.getItem(OBJECTIVE_KEY) || "{}");

    // ลบทุก objective ที่ขึ้นต้นด้วย questName|
    Object.keys(saved).forEach((key) => {
      if (key.startsWith(`${questName}|`)) {
        delete saved[key];
      }
    });

    localStorage.setItem(
      OBJECTIVE_KEY,
      JSON.stringify(saved)
    );
  };





  const autoMatchQuest = (text) => {
    const matched = [];
    let remainingText = text.toLowerCase();

    quests.forEach((quest) => {
      const qName = quest.name.toLowerCase();

      if (remainingText.includes(qName)) {
        addQuest(quest);
        matched.push(quest.name);

        // ลบ quest ที่ match ออกจาก text
        remainingText = remainingText.replaceAll(qName, "");
      }
    });

    setOcrMatched(matched.length > 0);
    setOcrMatchedQuests(matched);

    // เก็บ text ที่ไม่ match
    setOcrUnmatchedText(remainingText.trim());
  };


  /* ---------------- UI ---------------- */
  return (
    <div className="container py-5">
      <h2 className="fw-bold mb-4">➕ Add Quest</h2>

      {/* SEARCH */}
      <div className="mb-3">
        <h6>🔍 Search Quest</h6>
        <input
          className="form-control"
          placeholder="Search quest name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* SEARCH RESULT */}
      {search && (
        <ul className="list-group mb-4">
          {filteredQuests.slice(0, 10).map((quest) => {
            const saved = selectedQuests.some(
              (q) => q.name === quest.name
            );

            return (
              <li
                key={quest.name}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>{quest.name}</span>

                <button
                  className="btn btn-sm btn-success"
                  disabled={saved}
                  onClick={() => addQuest(quest)}
                >
                  {saved ? "Added" : "➕ Add"}
                </button>
              </li>
            );
          })}

          {filteredQuests.length === 0 && (
            <li className="list-group-item text-muted">
              No quest found
            </li>
          )}
        </ul>
      )}



      {/* SCAN */}
      <div className="card border-dashed p-4 text-center">
        <h6 className="fw-bold">📸 Scan Quest From Image</h6>
        <p className="text-muted mb-2">
          Paste image here using <kbd>Ctrl</kbd> + <kbd>V</kbd>
        </p>

        {loading && (
          <div className="text-warning fw-bold">
            Scanning image...
          </div>
        )}
      </div>

      {/* OCR MATCH RESULT */}
      {ocrMatched !== null && (
        <div className="card mt-3">
          <div className="card-body">
            {ocrMatched ? (
              <>
                <h6 className="fw-bold text-success">
                  ✅ OCR Matched Quests
                </h6>
                <ul className="mb-0">
                  {ocrMatchedQuests.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h6 className="fw-bold text-danger">
                  ❌ No quest matched from OCR
                </h6>
                <div className="text-muted small">
                  Try clearer image or add quest manually
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* OCR UNMATCHED TEXT */}
      {ocrUnmatchedText && (
        <div className="card mt-3 border-warning">
          <div className="card-body">
            <h6 className="fw-bold text-warning">
              📝 OCR Text (Unmatched)
            </h6>
            <pre
              className="small text-muted"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {ocrUnmatchedText}
            </pre>
          </div>
        </div>
      )}



      {/* 🧑‍💼 TRADER FILTER */}
      {traderOptions.length > 0 && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-2">
              🧑‍💼 Filter by Trader
            </h6>

            <div className="d-flex flex-wrap gap-2">
              {traderOptions.map((trader) => (
                <button
                  key={trader}
                  className={`btn btn-sm ${selectedTraders.includes(trader)
                    ? "btn-primary"
                    : "btn-outline-primary"
                    }`}
                  onClick={() => toggleTrader(trader)}
                >
                  {trader}
                </button>
              ))}
            </div>

            {selectedTraders.length > 0 && (
              <button
                className="btn btn-sm btn-link mt-2 text-danger"
                onClick={() => setSelectedTraders([])}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ✅ SELECTED QUESTS (NAME ONLY) */}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-2">
            📋 Selected Quests
          </h6>

          {selectedQuests.length === 0 ? (
            <div className="text-muted small">
              No quests added yet
            </div>
          ) : (
            <ul className="list-group list-group-flush">
              {filteredSelectedQuests.map((quest) => (
                <li
                  key={quest.name}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <span>{quest.name}</span>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeQuest(quest.name)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
};

export default AddQuest;
