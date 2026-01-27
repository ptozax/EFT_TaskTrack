import React, { useState, useEffect, useRef, useMemo } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import quests from "../data/tasks";
import * as QuestComponent from '../Component/QuestComponent';
import { TRADER_THEMES } from '../Component/EftComponent';

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const COMPLETE_KEY = "eft_completed_quests";

const Home = () => {
  /* ---------------- SAVE STATE ---------------- */
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

  /* ---------------- STATE ---------------- */
  const [search, setSearch] = useState("");
  const [objectiveLocations, setObjectiveLocations] = useState([]);
  const [currentQuestId, setCurrentQuestId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);


  const [hiddenObjectives, setHiddenObjectives] = useState({});

  const refs = useRef({}); // for focus to  task obj

  /*------------- Click and focus to quest  -------------*/

  const scrollTo = (id) => {
    // basic  scroll
    // refs.current[id]?.scrollIntoView({
    //   behavior: "smooth",
    //   block: "center",
    // });

    //  scroll to box with offet 80px
    const el = refs.current[id];
    if (!el) return;

    const y =
      el.getBoundingClientRect().top + window.pageYOffset - 80;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  /* ---------------- UTILS ---------------- */
  const toggleHideObjective = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setHiddenObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };


  const getObjectiveKey = (questId, objectiveId) =>
    `${questId}|${objectiveId}`;


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

    const handleStorageChange = () => {
      try {
        console.log("Storage changed detected! at HOME");

        const savedQuests = localStorage.getItem(STORAGE_KEY);
        const savedChecklist = localStorage.getItem(OBJECTIVE_CHECK_KEY);
        const savedCompleted = localStorage.getItem(COMPLETE_KEY);

        setSelectedQuests(savedQuests ? JSON.parse(savedQuests) : []);
        setCheckedObjectives(savedChecklist ? JSON.parse(savedChecklist) : {});
        setCompletedQuests(savedCompleted ? JSON.parse(savedCompleted) : []);
      } catch (err) {
        console.error(err);
      }
    };
    setIsLoaded(true);

    // Add listener
    window.addEventListener("storage", handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };

  }, []);

  /* ---------------- SAVE ---------------- */
  useEffect(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests));
  }, [selectedQuests, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(OBJECTIVE_CHECK_KEY, JSON.stringify(checkedObjectives));
  }, [checkedObjectives, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
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
  }, [completedQuests, currentQuestId, isLoaded]);

  /* ---------------- TRADER ---------------- */
  const traderOptions = useMemo(() => {
    return ["Any",
      ...new Set(
        quests
          .map((q) => q.trader?.name)
          .filter(Boolean)
      ),
    ];
  }, [selectedQuests]); // Only recalculate if selectedQuests changes

  const [selectedTraders, setSelectedTraders] = useState([]);

  const toggleTrader = (trader) => {
    if (trader === "Any") {
      setSelectedTraders([]);
      return;
    }

    setSelectedTraders((prev) =>
      prev.includes(trader)
        ? prev.filter((t) => t !== trader)
        : [...prev, trader]
    );
  };

  /* ---------------- QUEST ACTIONS ---------------- */
  const addQuest = (quest) => {
    setSelectedQuests((prev) => [...prev, quest]);
    setSearch("");
  };

  const removeQuest = (questId) => {
    // ลบ quest
    setSelectedQuests((prev) =>
      prev.filter((q) => q.id !== questId)
    );

    // ลบ objective progress ของ quest นี้
    clearObjectiveProgress(questId);
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

  const toggleObjective = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setCheckedObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const nextQuest = (questId) => {

    const newCompleted = QuestComponent.getPreviousQuestsList(questId, completedQuests);
    const idsToRemove = new Set(newCompleted.map(u => u.id));
    idsToRemove.add(questId);
    idsToRemove.forEach(id => {
      removeQuest(id);
    })

    setCurrentQuestId(questId);
    // Update state using a Set to ensure no duplicates
    setCompletedQuests(prev => {
      const uniqueSet = new Set([...prev, ...newCompleted]);
      return Array.from(uniqueSet);
    });
  }

  /* ---------------- SEARCH ---------------- */
  const searchResults = quests.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedQuests.some((s) => s.name === q.name)
  );

  /* ---------------- UI ---------------- */

  const filteredQuests =
    objectiveLocations.length === 0
      ? selectedQuests
      : selectedQuests.filter((quest) =>
        quest.objectives?.some((obj) =>
          obj.maps?.some((m) =>
            objectiveLocations.includes(m.name)
          )
        )
      );

  return (

    <div className="container-fluid">
      <div className="row justify-content-md-center">
        <div className="col-md-11 ">

          {/* HEADER */}
          <h1 className="text-center fw-bold mb-4">
            <span className="text-primary">EFT</span>{" "}
            <span className="text-warning">TaskTrack</span>
          </h1>

          {/* SEARCH */}
          <div className="row justify-content-center mb-4">
            <div className="col-md-6">
              <input
                className="form-control form-control-lg rounded-pill shadow-sm px-4"
                placeholder="🔍 Search quest..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* SEARCH RESULT */}
          {search && (
            <div className="row justify-content-center mb-4">
              <div className="col-md-6">
                <div className="card shadow">
                  <ul className="list-group list-group-flush">
                    {searchResults.map((q) => (
                      <li
                        key={`${q.id}-${q.name}`}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span className="fw-medium">{q.name}</span>
                        <button
                          className="btn btn-sm btn-success rounded-pill px-3"
                          onClick={() => addQuest(q)}
                        >
                          + Add
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* MAP FILTER */}
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
                      className={`btn btn-sm rounded-pill px-3 transition ${active
                        ? "btn-primary shadow"
                        : "btn-outline-secondary"
                        }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* 🧑‍💼 TRADER FILTER */}
            {traderOptions.length > 0 && (
              <div className="card-body">
                <h6 className="fw-bold mb-2">
                  🧑‍💼 Filter by Trader
                </h6>

                <div className="d-flex flex-wrap gap-2">
                  {traderOptions.map((trader) => {
                    const active = trader === "Any" ? selectedTraders.length === 0 : selectedTraders.includes(trader);
                    const theme = active ? TRADER_THEMES[trader] : { bg: "#1e293b", border: "#334155", text: "#f8fafc" };
                    
                    return (
                      <button
                        key={trader}
                        className={'btn btn-sm'}
                        style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                        onClick={() => toggleTrader(trader)}
                      >
                        {trader}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SELECTED QUESTS */}
          {selectedQuests.length > 0 && (
            <div className="row g-4">

              {/* LEFT : QUEST LIST */}
              <div className="col-md-4">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5 className="fw-bold mb-3">📜 Selected Quests</h5>

                    <ul className="list-group">
                      {filteredQuests.map((quest) => (
                        (selectedTraders.length === 0 || selectedTraders.includes(quest.trader.name)) && (
                          <li
                            key={quest.id}
                            className="list-group-item list-group-item-action"
                            onClick={() => scrollTo(quest.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className="d-flex justify-content-between align-items-center gap-3">

                              {/* LEFT : QUEST INFO */}
                              <div className="flex-grow-1">
                                <a
                                  className="fw-bold text-info text-decoration-none"
                                  href={quest.wikiLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {quest.name}
                                </a>

                                <div className="text-muted small mt-1">
                                  {quest.trader.name} | EXP: {quest.experience}

                                  {quest.kappaRequired && (
                                    <span className="badge rounded-pill bg-success ms-2">
                                      Kappa
                                    </span>
                                  )}

                                  {quest.lightkeeperRequired && (
                                    <span className="badge rounded-pill bg-info ms-1">
                                      LightKeeper
                                    </span>
                                  )}
                                </div>
                                <div className="text-muted small">
                                  Start at LV: {quest.minPlayerLevel}
                                </div>
                              </div>

                              {/* RIGHT : ACTION BUTTONS */}
                              <div className="d-flex align-items-center flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-success me-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nextQuest(quest.id);
                                  }}
                                  title="Complete"
                                >
                                  ✓
                                </button>

                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeQuest(quest.id);
                                  }}
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>

                            </div>
                          </li>
                        )))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* RIGHT : OBJECTIVES */}
              <div className="col-md-8">
                <div className="card shadow-sm h-100 bg-dark text-light border-secondary">
                  <div className="card-body">

                    <h5 className="fw-bold mb-3 text-info">🎯 Objectives</h5>
                    {filteredQuests.length === 0 && (
                      <div
                        className="mb-4 p-3 rounded border border-secondary bg-black bg-opacity-25 "
                      >
                        หาม้ายเควสนิ
                      </div>
                    )}
                    {filteredQuests.map((quest) => {
                      const filteredObjectives =
                        quest.objectives?.filter(
                          (obj) =>
                            objectiveLocations.length === 0 ||
                            obj.maps?.some((m) =>
                              objectiveLocations.includes(m.name)
                            )
                        ) || [];

                      if (selectedTraders.length > 0 && !selectedTraders.includes(quest.trader.name)) return null;
                      if (filteredObjectives.length === 0) return null;

                      return (
                        <div
                          key={quest.name}
                          ref={(el) => (refs.current[quest.id] = el)}
                          className="mb-4 p-3 rounded border border-secondary bg-black bg-opacity-25"
                        >
                          {/* QUEST HEADER */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <a
                                className="fw-bold text-primary"
                                href={quest.wikiLink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {quest.name}
                              </a>
                              <span className="p-2">
                                Start at LV: {quest.minPlayerLevel}
                              </span>
                            </div>
                            <div>
                              <button
                                className="btn btn-sm btn-outline-success me-2"
                                onClick={() => nextQuest(quest.id)}
                              >
                                ✓
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeQuest(quest.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* OBJECTIVES */}
                          <ul className="list-unstyled mb-0">
                            {filteredObjectives.map((obj) => {
                              const key = getObjectiveKey(quest.id, obj.id);
                              const checked = checkedObjectives[key];
                              const hidden = hiddenObjectives[key];
                              if (hidden) return null;

                              return (
                                <li
                                  key={key}
                                  className={`mb-2 p-3 rounded ${checked
                                    ? "bg-success bg-opacity-10 border border-success"
                                    : "bg-secondary bg-opacity-10 border border-secondary"
                                    }`}
                                  onClick={() =>
                                    toggleObjective(quest.id, obj.id)
                                  }
                                  style={{ cursor: "pointer" }}
                                >
                                  <div className="d-flex justify-content-between align-items-start">
                                    <span
                                      className={`fw-medium ${checked
                                        ? "text-decoration-line-through text-muted"
                                        : "text-light"
                                        }`}
                                    >
                                      {obj.description} {["giveItem", "TaskObjectiveShoot", "shoot", "kill"].includes(obj.type) && <> <span className='text-info'>x {obj.count}</span> </>}
                                    </span>

                                    <button
                                      className="btn btn-sm btn-outline-warning ms-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleHideObjective(
                                          quest.id,
                                          obj.id
                                        );
                                      }}
                                    >
                                      <i className="fa-regular fa-eye-slash"></i>
                                    </button>
                                  </div>

                                  {/* MAP TAGS */}
                                  {obj.maps?.length > 0 && (
                                    <div className="mt-2">
                                      {obj.maps.map((m) => (
                                        <span
                                          key={m.name}
                                          className={`badge rounded-pill me-1 ${checked
                                            ? "bg-success"
                                            : "bg-secondary"
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
      </div>
    </div>
  );
};

export default Home;
