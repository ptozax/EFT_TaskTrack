// pages/MapPage.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, ImageOverlay, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import quests from "../data/tasks";

const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const STORAGE_KEY = "eft_selected_quests";

/* ---------------- PIN UTILS ---------------- */
const getObjectivePins = (objective) => {
  const pins = [];

  objective.zones?.forEach((z) => {
    if (z?.position) {
      pins.push({ x: z.position.x, y: z.position.y, type: "zone" });
    }
  });

  objective.possibleLocations?.forEach((loc) => {
    loc.positions?.forEach((p) => {
      pins.push({ x: p.x, y: p.y, type: "possible" });
    });
  });

  return pins;
};

/* ---------------- ICONS ---------------- */
const zoneIcon = new L.DivIcon({
  className: "map-icon zone",
  html: "🔴",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const possibleIcon = new L.DivIcon({
  className: "map-icon possible",
  html: "🟡",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const doneIcon = new L.DivIcon({
  className: "map-icon done",
  html: "✅",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/* ---------------- MAP CONFIG ---------------- */
const MAPS = {
  Woods: {
    image: "https://assets.tarkov.dev/maps/svg/Woods.svg",
    bounds: [
      [-61, -97],
      [139, 103],
    ],
  },
};

const MapPage = () => {
  const [selectedMap, setSelectedMap] = useState("Woods");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});

  /* ---------------- LOAD LOCAL STORAGE ---------------- */
  useEffect(() => {
    const qSaved = localStorage.getItem(STORAGE_KEY);
    const cSaved = localStorage.getItem(OBJECTIVE_CHECK_KEY);

    if (qSaved) setSelectedQuests(JSON.parse(qSaved));
    if (cSaved) setCheckedObjectives(JSON.parse(cSaved));
  }, []);

  /* ---------------- FULL QUEST DATA ---------------- */
  const selectedQuestNames = selectedQuests.map((q) => q.name);

  const fullSelectedQuests = quests.filter((q) =>
    selectedQuestNames.includes(q.name)
  );

  /* ---------------- OBJECTIVES ---------------- */
  const objectives = fullSelectedQuests.flatMap((q) =>
    q.objectives
      ?.filter(
        (obj) =>
          !obj.maps?.length ||
          obj.maps?.some(
            (m) => m.name?.toLowerCase() === selectedMap.toLowerCase()
          )
      )
      .map((obj, index) => ({
        ...obj,
        questName: q.name,
        objectiveIndex: index,
      }))
  );

  return (
    <div className="container py-4 text-light">
      <h3 className="fw-bold mb-3">🗺️ Interactive Quest Map</h3>

      <select
        className="form-select mb-3"
        value={selectedMap}
        onChange={(e) => setSelectedMap(e.target.value)}
      >
        {Object.keys(MAPS).map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <MapContainer
        center={[0, 0]}
        zoom={2}
        crs={L.CRS.Simple}
        style={{ height: "600px" }}
      >
        <ImageOverlay
          url={MAPS[selectedMap].image}
          bounds={MAPS[selectedMap].bounds}
        />

        {objectives.map((obj) =>
          getObjectivePins(obj).map((pin, idx) => {
            const key = `${obj.questName}|${obj.objectiveIndex}`;
            const isChecked = checkedObjectives[key];

            const icon = isChecked
              ? doneIcon
              : pin.type === "zone"
              ? zoneIcon
              : possibleIcon;

            return (
              <Marker
                key={`${key}-${idx}`}
                position={[pin.y*1/6.8, pin.x*-1/6.8]}
                icon={icon}
              >
                <Popup>
                  <strong>{obj.questName}</strong>
                  <br />
                  {obj.description}
                  <br />
                  <small>{pin.type}</small>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>
    </div>
  );
};

export default MapPage;
