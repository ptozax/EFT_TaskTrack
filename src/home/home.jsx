import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import quests from "../data/tasks";

const STORAGE_KEY = "eft_selected_quests";
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";

const Home = () => {
  const [search, setSearch] = useState("");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [objectiveLocations, setObjectiveLocations] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});



  const LOCATIONS = [
    "Any",

    "Ground Zero",
    "Ground Zero 21+",

    "Factory",
    "Night Factory",

    "Customs",

    "Reserve",
    "Streets of Tarkov",
    "The Lab",
    "Woods",
    "Interchange",

    "Lighthouse",
    "Shoreline",

    "The Labyrinth",


  ];







  const getAllObjectiveLocations = (quests) => {
    const locations = new Set();

    quests.forEach((quest) => {
      quest.objectives?.forEach((obj) => {
        obj.maps?.forEach((map) => {
          if (map?.name) {
            locations.add(map.name);
          }
        });
      });
    });

    return Array.from(locations).map((name) => ({ name }));
  };

  const allLocations = [
    "Any",
    ...getAllObjectiveLocations(quests).map(l => l.name),
  ];


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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSelectedQuests(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    const savedChecklist = localStorage.getItem(OBJECTIVE_CHECK_KEY);
    if (savedChecklist) {
      setCheckedObjectives(JSON.parse(savedChecklist));
    }

    setIsLoaded(true);
  }, []);

  /* ---------------- SAVE ---------------- */
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedQuests));
  }, [selectedQuests, isLoaded]);
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(
      OBJECTIVE_CHECK_KEY,
      JSON.stringify(checkedObjectives)
    );
  }, [checkedObjectives, isLoaded]);

  /* ---------------- SEARCH ---------------- */
  const searchResults = quests.filter(
    (q) =>
      q.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedQuests.some((s) => s.name === q.name)
  );

  const addQuest = (quest) => {
    setSelectedQuests((prev) => [...prev, quest]);
    setSearch("");
  };

  const removeQuest = (name) => {
    setSelectedQuests((prev) =>
      prev.filter((q) => q.name !== name)
    );
  };




  const toggleObjective = (questName, index) => {
    const key = `${questName}|${index}`;

    setCheckedObjectives((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
















  /* ---------------- UI ---------------- */
  return (
    <div className="container py-5">
      <h1 className="text-center fw-bold text-primary mb-4">
        EFT TaskTrack
      </h1>

      {/* Search */}
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

      {/* Search Results */}
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

      {/* Location Filter */}
      <div className="row justify-content-center mb-4">
        <div className="col-md-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                🗺️ Filter Objectives by Map
              </h6>

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
                      className={`btn btn-sm rounded-pill px-3 ${active
                        ? "btn-primary"
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
        </div>
      </div>

      {/* Selected Quests */}
      {selectedQuests.length > 0 && (
        <div className="row g-4">
          {selectedQuests.map((quest) => (
            <motion.div
              key={quest.name}
              className="col-md-6 col-lg-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="card h-100 shadow-sm border-primary">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <h5 className="fw-bold">
                      <a
                        href={quest.wikiLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none text-primary"
                      >
                        {quest.name}
                      </a>
                    </h5>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeQuest(quest.name)}
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-muted mb-1">
                    Required Level: {quest.minPlayerLevel}
                  </p>

                  <p>
                    <strong>EXP:</strong> {quest.experience}
                  </p>

                  <strong>Objectives:</strong>


                 





<ul className="list-unstyled mt-2">
  {quest.objectives
    ?.filter(
      (obj) =>
        objectiveLocations.length === 0 ||
        obj.maps?.some((m) =>
          objectiveLocations.includes(m.name)
        )
    )
    .map((obj, i) => {
      const key = `${quest.name}|${i}`;
      const checked = checkedObjectives[key] || false;

      return (
        <li
          key={key}
          onClick={() => toggleObjective(quest.name, i)}
          className={`mb-2 p-2 rounded d-flex flex-column ${
            checked
              ? "bg-success bg-opacity-10 border border-success text-success"
              : "bg-light text-dark"
          }`}
          style={{ cursor: "pointer" }}
        >
          <span
            className={`fw-medium ${
              checked ? "text-decoration-line-through" : ""
            }`}
          >
            {obj.description}
          </span>

          {/* MAP BADGE */}
          {obj.maps?.length > 0 && (
            <div className="mt-1">
              {obj.maps.map((m) => (
                <span
                  key={m.name}
                  className={`badge me-1 ${
                    checked ? "bg-success" : "bg-secondary"
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
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
