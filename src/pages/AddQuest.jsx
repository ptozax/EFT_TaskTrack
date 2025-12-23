import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import quests from "../data/tasks";

const STORAGE_KEY = "eft_selected_quests";

const AddQuest = () => {
  const [search, setSearch] = useState("");
  const [imageText, setImageText] = useState("");
  const [loading, setLoading] = useState(false);






const filteredQuests = quests.filter((q) =>
  q.name.toLowerCase().includes(search.toLowerCase())
);

  /* ---------------- OCR ---------------- */
  const scanImage = async (image) => {
    setLoading(true);

    const { data } = await Tesseract.recognize(
      image,
      "eng",
      { logger: () => {} }
    );

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
          if (file) {
            scanImage(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  /* ---------------- MATCH QUEST ---------------- */
  const getSavedQuests = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  const addQuest = (quest) => {
    const saved = getSavedQuests();
    if (saved.some((q) => q.name === quest.name)) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...saved, quest])
    );
  };

  const autoMatchQuest = (text) => {
    quests.forEach((quest) => {
      if (text.toLowerCase().includes(quest.name.toLowerCase())) {
        addQuest(quest);
      }
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="container py-5">
      <h2 className="fw-bold mb-4">➕ Add Quest</h2>

      {/* SEARCH */}
      <div className="mb-4">
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
  <ul className="list-group mt-2">
    {filteredQuests.length === 0 && (
      <li className="list-group-item text-muted">
        No quest found
      </li>
    )}

    {filteredQuests.slice(0, 10).map((quest) => {
      const saved = getSavedQuests().some(
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

      {/* OCR RESULT */}
      {imageText && (
        <div className="card mt-3">
          <div className="card-body">
            <h6 className="fw-bold">OCR Result</h6>
            <pre className="small">{imageText}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddQuest;
