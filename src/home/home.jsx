import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import quests from "../data/quests";

const STORAGE_KEY = "eft_selected_quests";

const Home = () => {
  const [search, setSearch] = useState("");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [objectiveLocations, setObjectiveLocations] = useState([]);

  const LOCATIONS = [
    { id: 6, name: "Reserve" },
    { id: 1, name: "Customs" },
    { id: 0, name: "Factory" },
    { id: -1, name: "Any" },
  ];







  const toggleLocation = (id) => {
    if (id === -1) {
      setObjectiveLocations([]);
      return;
    }

    setObjectiveLocations((prev) =>
      prev.includes(id)
        ? prev.filter((l) => l !== id)
        : [...prev, id]
    );
  };










  // ✅ LOAD (ครั้งแรกเท่านั้น)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setSelectedQuests(JSON.parse(saved));
      } catch (err) {
        console.error("localStorage parse error", err);
      }
    }

    setIsLoaded(true);
  }, []);

  // ✅ SAVE (หลังจากโหลดแล้วเท่านั้น)
  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(selectedQuests)
    );
  }, [selectedQuests, isLoaded]);

  const searchResults = quests.filter(
    (q) =>
      q.locales.en.toLowerCase().includes(search.toLowerCase()) &&
      !selectedQuests.some((s) => s.id === q.id)
  );

  const addQuest = (quest) => {
    setSelectedQuests((prev) => [...prev, quest]);
    setSearch("");
  };

  const removeQuest = (id) => {
    setSelectedQuests((prev) =>
      prev.filter((q) => q.id !== id)
    );
  };

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

      {/* Search Result */}
      {search && (
        <div className="row justify-content-center mb-4">
          <div className="col-md-6">
            <ul className="list-group">
              {searchResults.map((q) => (
                <li
                  key={q.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {q.locales.en}
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



      <div className="row justify-content-center mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-3">
                🗺️ Filter Objectives by Location
              </h6>

              <div className="d-flex flex-wrap gap-2">
                {LOCATIONS.map((loc) => {
                  const active =
                    loc.id === -1
                      ? objectiveLocations.length === 0
                      :
                       objectiveLocations.includes(loc.id);

                  return (
                    <button
                      key={loc.id}
                      onClick={() => toggleLocation(loc.id)}
                      className={`btn btn-sm rounded-pill px-3 ${active
                        ? "btn-primary"
                        : "btn-outline-secondary"
                        }`}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

      {selectedQuests.length > 0 && (
        <div className="row g-4">
          {selectedQuests.map((quest) => (
            <motion.div
              key={quest.id}
              className="col-md-6 col-lg-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="card h-100 shadow-sm border-primary">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <h5 className="fw-bold">
                      {quest.locales.en}
                    </h5>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeQuest(quest.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-muted mb-1">
                    Required Level: {quest.require.level}
                  </p>

                  <p>
                    <strong>EXP:</strong> {quest.exp}
                  </p>

                  <strong>Objectives:</strong>
                  <ul>
                    {quest.objectives
                      .filter((obj) =>
                        objectiveLocations.length === 0 ||
                        objectiveLocations.includes(obj.location)
                      )
                      .map((obj) => (
                        <li key={obj.id}>
                          <strong>{obj.type}</strong> – {obj.target} × {obj.number}
                          <span className="badge bg-secondary ms-2">
                            {LOCATIONS.find((l) => l.id === obj.location)?.name}
                          </span>
                        </li>
                      ))}
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
