import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import quests from "../data/tasks";

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";

const Home = () => {
  /* ---------------- STATE ---------------- */
  const [search, setSearch] = useState("");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [objectiveLocations, setObjectiveLocations] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);


  const [hiddenObjectives, setHiddenObjectives] = useState({});




  const toggleHideObjective = (questName, index) => {
    const key = `${questName}|${index}`;
    setHiddenObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };





  /* ---------------- UTILS ---------------- */
  const getAllObjectiveLocations = (quests) => {
    const locations = new Set();

    quests.forEach((quest) =>
      quest.objectives?.forEach((obj) =>
        obj.maps?.forEach((map) => map?.name && locations.add(map.name))
      )
    );

    return ["Any", ...Array.from(locations)];
  };

  const allLocations = getAllObjectiveLocations(quests);

  /* ---------------- LOCATION FILTER ---------------- */
  const toggleLocation = (name) => {
    if (name === "Any") {
      setObjectiveLocations([]);
      return;
    }

    setObjectiveLocations((prev) =>
      prev.includes(name)
        ? prev.filter((l) => l !== name)
        : [...prev, name]
    );
  };

  /* ---------------- LOAD ---------------- */
  useEffect(() => {
    try {
      const savedQuests = localStorage.getItem(STORAGE_KEY);
      const savedChecklist = localStorage.getItem(OBJECTIVE_CHECK_KEY);

      if (savedQuests) setSelectedQuests(JSON.parse(savedQuests));
      if (savedChecklist) setCheckedObjectives(JSON.parse(savedChecklist));
    } catch (err) {
      console.error(err);
    }

    setIsLoaded(true);
  }, []);

  /* ---------------- SAVE ---------------- */
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests));
    }
  }, [selectedQuests, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        OBJECTIVE_CHECK_KEY,
        JSON.stringify(checkedObjectives)
      );
    }
  }, [checkedObjectives, isLoaded]);

  /* ---------------- QUEST ACTIONS ---------------- */
  const addQuest = (quest) => {
    setSelectedQuests((prev) => [...prev, quest]);
    setSearch("");
  };

  const removeQuest = (name) => {
    // ลบ quest
    setSelectedQuests((prev) =>
      prev.filter((q) => q.name !== name)
    );

    // ลบ objective progress ของ quest นี้
    clearObjectiveProgress(name);
  };





  const clearObjectiveProgress = (questName) => {
    setCheckedObjectives((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((key) => {
        if (key.startsWith(`${questName}|`)) {
          delete updated[key];
        }
      });

      return updated;
    });
  };



  const toggleObjective = (questName, index) => {
    const key = `${questName}|${index}`;
    setCheckedObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /* ---------------- SEARCH ---------------- */
  const searchResults = quests.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedQuests.some((s) => s.name === q.name)
  );

  /* ---------------- UI ---------------- */
  return (
    <div className="container py-5">
      <h1 className="text-center fw-bold text-primary mb-4">
        EFT TaskTrack
      </h1>

      {/* SEARCH */}
      <div className="row justify-content-center mb-3">
        <div className="col-md-6">
          <input
            className="form-control form-control-lg"
            placeholder="🔍 Search quest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* SEARCH RESULTS */}
      {search && (
        <div className="row justify-content-center mb-4">
          <div className="col-md-6">
            <ul className="list-group">
              {searchResults.map((q) => (
                <li
                  key={q.name}
                  className="list-group-item d-flex justify-content-between"
                >
                  {q.name}
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => addQuest(q)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* LOCATION FILTER */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="fw-bold mb-3">🗺️ Filter Objectives by Map</h6>
          <div className="d-flex flex-wrap gap-2">
            {allLocations.map((loc) => {
              const active =
                loc === "Any"
                  ? objectiveLocations.length === 0
                  : objectiveLocations.includes(loc);

              return (
                <button
                  key={loc}
                  onClick={() => toggleLocation(loc)}
                  className={`btn btn-sm rounded-pill px-3 ${active ? "btn-primary" : "btn-outline-secondary"
                    }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SELECTED QUESTS */}
      {selectedQuests.length > 0 && (
        <div className="row g-4">
          {/* LEFT */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">📜 Selected Quests</h5>
                <ul className="list-group">
                  {selectedQuests.map((quest) => (
                    <li
                      key={quest.name}
                      className="list-group-item d-flex justify-content-between align-items-start"
                    >
                      {/* LEFT : QUEST INFO */}
                      <div>
                        <a className="fw-bold text-info mb-1"
                          href={quest.wikiLink}
                          target="_blank"
                          rel="noreferrer"

                        >
                          {quest.name}
                        </a>





                        <p className="text-muted small mb-0">
                          EXP: {quest.experience} | Lv {quest.minPlayerLevel}
                        </p>
                      </div>

                      {/* RIGHT : REMOVE BUTTON */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeQuest(quest.name)}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-md-8">
            <div className="card shadow-sm h-100 bg-dark text-light border-secondary">
              <div className="card-body">
                <h5 className="fw-bold mb-3 text-info">🎯 Objectives</h5>

                {selectedQuests.map((quest) => {
                  const filteredObjectives = quest.objectives?.filter(
                    (obj) =>
                      objectiveLocations.length === 0 ||
                      obj.maps?.some((m) => objectiveLocations.includes(m.name))
                  ) || [];

                  // 👉 ถ้าไม่มี objective หลัง filter → ซ่อน Quest
                  if (filteredObjectives.length === 0) return null;

                  return (
                    <div key={quest.name} className="mb-4">


                      <a className="fw-bold text-primary"
                        href={quest.wikiLink}
                        target="_blank"
                        rel="noreferrer"

                      >
                        {quest.name}
                      </a>




                      <ul className="list-unstyled">
                        {filteredObjectives.map((obj, i) => {
                          const key = `${quest.name}|${i}`;
                          const checked = checkedObjectives[key];
                          const hidden = hiddenObjectives[key]; // ✅ เพิ่มบรรทัดนี้

                          if (hidden) return null; // 👈 ซ่อนชั่วคราว

                          return (
                            <li
                              key={key}
                              className={`mb-2 p-2 rounded ${checked
                                ? "bg-success bg-opacity-10 border border-success text-success"
                                : "bg-secondary bg-opacity-10 border border-secondary text-light"
                                }`}
                            >
                              {/* OBJECTIVE ROW */}
                              <div
                                className="d-flex justify-content-between align-items-start  rounded"
                                onClick={() => toggleObjective(quest.name, i)}
                                style={{ cursor: "pointer" }}
                              >
                                {/* LEFT : DESCRIPTION */}
                                <span
                                  className={`fw-medium ${checked ? "text-decoration-line-through text-muted" : ""
                                    }`}
                                >
                                  {obj.description}
                                </span>

                                {/* RIGHT : HIDE BUTTON */}
                                <button
                                  className="btn btn-sm btn-outline-warning ms-2"
                                  onClick={(e) => {
                                    e.stopPropagation(); // ❗ กันไม่ให้ไป toggle checklist
                                    toggleHideObjective(quest.name, i);
                                  }}
                                  title="Hide objective"
                                >
                                 <i class="fa-regular fa-eye-slash"></i>
                                </button>
                              </div>

                              {/* MAP BADGES */}
                              {obj.maps?.length > 0 && (
                                <div className="mt-1">
                                  {obj.maps.map((m) => (
                                    <span
                                      key={m.name}
                                      className={`badge me-1 ${checked ? "bg-success" : "bg-secondary"
                                        }`}
                                    >
                                      {m.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}









              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
