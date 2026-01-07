import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import quests from "../data/tasks";
import { BiFontSize } from "react-icons/bi";

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const COMPLETE_KEY = "eft_completed_quests";

const Home = () => {
  /* ---------------- STATE ---------------- */
  const [search, setSearch] = useState("");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [objectiveLocations, setObjectiveLocations] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});
  const [completedQuests, setCompletedQuests] = useState([]);
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










  const toggleHideObjective = (questId, objectiveId) => {
    const key = getObjectiveKey(questId, objectiveId);
    setHiddenObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };


  const getObjectiveKey = (questId, objectiveId) =>
    `${questId}|${objectiveId}`;


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
      const savedCompleted = localStorage.getItem(COMPLETE_KEY);
      console.log(savedCompleted);

      if (savedQuests) setSelectedQuests(JSON.parse(savedQuests));
      if (savedChecklist) setCheckedObjectives(JSON.parse(savedChecklist));
      if (savedCompleted) setCompletedQuests(JSON.parse(savedCompleted));
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

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(COMPLETE_KEY, JSON.stringify(completedQuests));

      // 1. Find quests where at least one requirement is met in completedQuests
      const availableQuests = quests.filter(q =>
        q.taskRequirements.some(t => completedQuests.includes(t.task.id))
      );

      // 2. Filter out quests that are already completed
      const nextQuestList = availableQuests.filter(q => !completedQuests.includes(q.id));

      setSelectedQuests(prev => {
        // Use a Map or Set to ensure IDs are unique
        const allQuests = [...prev, ...nextQuestList];
        const uniqueMap = new Map(allQuests.map(q => [q.id, q]));
        return Array.from(uniqueMap.values());
      });
    }
  }, [completedQuests, isLoaded]);

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
    removeQuest(questId);
    setCompletedQuests(prev => [...prev, questId]);
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

    <div className="container py-5">

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
                    <li
                      key={quest.name}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-start"
                      onClick={() => scrollTo(quest.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div>
                        <a
                          className="fw-bold text-info"
                          href={quest.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {quest.name}
                        </a>
                        <p className="text-muted small mb-0">
                          {quest.trader.name} | EXP: {quest.experience}


                          {quest.kappaRequired && (<span className={`badge rounded-pill m-1 bg-success `} >Kappa</span>)}
                          {quest.lightkeeperRequired && (<span className={`badge rounded-pill m-1  bg-info `} >LightKeeper</span>)}


                        </p>
                      </div>

                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuest(quest.id);
                        }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT : OBJECTIVES */}
          <div className="col-md-8">
            <div className="card shadow-sm h-100 bg-dark text-light border-secondary">
              <div className="card-body">
                <h5 className="fw-bold mb-3 text-info">🎯 Objectives</h5>

                {filteredQuests.map((quest) => {
                  const filteredObjectives =
                    quest.objectives?.filter(
                      (obj) =>
                        objectiveLocations.length === 0 ||
                        obj.maps?.some((m) =>
                          objectiveLocations.includes(m.name)
                        )
                    ) || [];

                  if (filteredObjectives.length === 0) return null;

                  return (
                    <div
                      key={quest.name}
                      ref={(el) => (refs.current[quest.id] = el)}
                      className="mb-4 p-3 rounded border border-secondary bg-black bg-opacity-25"
                    >
                      {/* QUEST HEADER */}
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <a
                          className="fw-bold text-primary"
                          href={quest.wikiLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {quest.name}
                        </a>
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
                                  {obj.description}
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
  );
};

export default Home;
