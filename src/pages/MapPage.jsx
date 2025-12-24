// pages/MapPage.jsx
import React, { useState, useEffect } from "react";
import { MapContainer, ImageOverlay, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import quests from "../data/tasks";

/* ---------------- STORAGE KEYS ---------------- */
const OBJECTIVE_CHECK_KEY = "eft_objective_checklist";
const STORAGE_KEY = "eft_selected_quests";

/* ---------------- ICONS ---------------- */
const createIcon = (emoji, className) =>
  new L.DivIcon({
    className: `map-icon ${className}`,
    html: emoji,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const ICONS = {
  zone: createIcon("🔴", "zone"),
  possible: createIcon("🟡", "possible"),
  done: createIcon("✅", "done"),
};

/* ---------------- MAP CONFIG ---------------- */
const MAPS = {
  Woods: {
    image: "https://assets.tarkov.dev/maps/svg/Woods.svg",
    scale: 6.8,
    offsetX: 38,
    offsetY: 3,
    overlayScale: 0.15,
  },
};

/* ---------------- HELPERS ---------------- */
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

const toLeafletPos = (x, y, map) => [
  y * map.overlayScale,
  -x * map.overlayScale,
];

const getMapBounds = (map) => {
  const { scale, offsetX, offsetY, overlayScale } = map;

  return [
    [(-100 + offsetX) * scale * overlayScale, (-100 + offsetY) * scale * overlayScale],
    [(100 + offsetX) * scale * overlayScale, (100 + offsetY) * scale * overlayScale],
  ];
};

/* ---------------- COMPONENT ---------------- */
const MapPage = () => {
  const [selectedMap, setSelectedMap] = useState("Woods");
  const [selectedQuests, setSelectedQuests] = useState([]);
  const [checkedObjectives, setCheckedObjectives] = useState({});

  const mapConfig = MAPS[selectedMap];

  /* -------- LOAD LOCAL STORAGE -------- */
  useEffect(() => {
    const savedQuests = localStorage.getItem(STORAGE_KEY);
    const savedChecks = localStorage.getItem(OBJECTIVE_CHECK_KEY);

    if (savedQuests) setSelectedQuests(JSON.parse(savedQuests));
    if (savedChecks) setCheckedObjectives(JSON.parse(savedChecks));
  }, []);

  /* -------- FULL QUEST DATA -------- */
  const selectedQuestNames = selectedQuests.map((q) => q.name);

  const objectives = quests
    .filter((q) => selectedQuestNames.includes(q.name))
    .flatMap((q) =>
      q.objectives
        ?.filter(
          (obj) =>
            !obj.maps?.length ||
            obj.maps.some(
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
        {Object.keys(MAPS).map((map) => (
          <option key={map}>{map}</option>
        ))}
      </select>

      <MapContainer
        center={[0, 0]}
        zoom={2}
        crs={L.CRS.Simple}
        style={{ height: "600px" }}
      >
        <ImageOverlay
          url={mapConfig.image}
          bounds={getMapBounds(mapConfig)}
        />

        {objectives.map((obj) =>
          getObjectivePins(obj).map((pin, idx) => {
            const key = `${obj.questName}|${obj.objectiveIndex}`;
            const isChecked = checkedObjectives[key];

            return (
              <Marker
                key={`${key}-${idx}`}
                position={toLeafletPos(pin.x, pin.y, mapConfig)}
                icon={isChecked ? ICONS.done : ICONS[pin.type]}
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
