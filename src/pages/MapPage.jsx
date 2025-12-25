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
  "Woods": {
    image: "https://assets.tarkov.dev/maps/svg/Woods.svg",
    scale: 6.8,
    offsetX: 36,
    offsetY: 3,
    overlayScale: 0.15,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  "Factory": {
    image: "https://assets.tarkov.dev/maps/svg/Factory.svg",
    scale: 0.74,
    offsetX: 7,
    offsetY: -2,
    overlayScale: 0.15,
    invertX: 1,
    invertY: -1,
    rotate: 0
  },


  "Night Factory": {
    image: "https://assets.tarkov.dev/maps/svg/Factory.svg",
    scale: 0.74,
    offsetX: 7,
    offsetY: -2,
    overlayScale: 0.15,
    invertX: 1,
    invertY: -1,
    rotate: 0
  },



  "Customs": {
    image: "https://assets.tarkov.dev/maps/svg/Customs.svg",
    scale: 5.35,
    offsetX: 7,
    offsetY: -30.5,
    overlayScale: 0.15,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },



  "Interchange": {
    image: "https://assets.tarkov.dev/maps/svg/Interchange.svg",
    scale: 4.5,
    offsetX: -1,
    offsetY: -19,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  "Lighthouse": {
    image: "https://assets.tarkov.dev/maps/svg/Lighthouse.svg",
    scale: 8.7,
    offsetX: 15.7,
    offsetY: 1.6,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },




  "Ground Zero": {
    image: "https://assets.tarkov.dev/maps/svg/GroundZero.svg",
    scale: 2.45,
    offsetX: -49.25,
    offsetY: -30.8,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },


  "Ground Zero 21+": {
    image: "https://assets.tarkov.dev/maps/svg/GroundZero.svg",
    scale: 2.45,
    offsetX: -49.25,
    offsetY: -30.8,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  "Shoreline": {
    image: "https://assets.tarkov.dev/maps/svg/Shoreline.svg",
    scale: 7.78,
    offsetX: -12.5,
    offsetY: 35,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  "Streets of Tarkov": {
    image: "https://assets.tarkov.dev/maps/svg/StreetsOfTarkov.svg",
    scale: 4.15,
    offsetX: -28,
    offsetY: -5.25,
    overlayScale: 0.25,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  //---------------------------------------------------------------------------------
  "The Lab": {
    image: "labs.png",
    scale: 1.5,
    offsetX: 123.5,
    offsetY: -226,
    overlayScale: 0.15,
    invertX: 1,
    invertY: 1,
    rotate: 90
  },

  "The Labyrinth": {
    image: "labyrinth.png",
    scale: 8.7,
    offsetX: 15.7,
    offsetY: 1.6,
    overlayScale: 0.15,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

  "Reserve": {
    image: "https://assets.tarkov.dev/maps/svg/Reserve.svg",
    scale: 8.7,
    offsetX: 15.7,
    offsetY: 1.6,
    overlayScale: 0.15,
    invertX: 1,
    invertY: 1,
    rotate: 0
  },

};


/* ---------------- HELPERS ---------------- */




const rotatePoint = ([lat, lng], angle) => {
  switch (angle) {
    case 90:
      return [lng, -lat];
    case -90:
      return [-lng, lat];
    case 180:
      return [-lat, -lng];
    default:
      return [lat, lng];
  }
};










const getObjectiveKey = (questId, objectiveId) =>
  `${questId}|${objectiveId}`;






const getObjectivePins = (objective) => {
  const pins = [];

  objective.zones?.forEach((z) => {
    if (z?.position) {
      pins.push({ x: z.position.x, y: z.position.z, type: "zone" });
    }
  });

  objective.possibleLocations?.forEach((loc) => {
    loc.positions?.forEach((p) => {
      pins.push({ x: p.x, y: p.z, type: "possible" });
    });
  });

  return pins;
};

const toLeafletPos = (x, y, map) => {
  const base = [
    -y * map.overlayScale * map.invertY,
    -x * map.overlayScale * map.invertX,
  ];

  return map.rotate
    ? rotatePoint(base, map.rotate)
    : base;
};
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
  const selectedQuestIds = selectedQuests.map((q) => q.id);

  const objectives = quests
    .filter((q) => selectedQuestIds.includes(q.id))
    .flatMap((q) =>
      q.objectives
        ?.filter(
          (obj) =>
            !obj.maps?.length ||
            obj.maps.some(
              (m) => m.name?.toLowerCase() === selectedMap.toLowerCase()
            )
        )
        .map((obj) => ({
          ...obj,
          questId: q.id,
          questName: q.name, // ใช้แสดงผลได้
        }))
    );


  /* ---------- MARKER OFFSET HELPERS ---------- */

  // สร้าง key สำหรับตำแหน่ง
  const posKey = (lat, lng) =>
    `${lat.toFixed(4)},${lng.toFixed(4)}`;

  // กระจาย marker เป็นวง
  const getOffsetPosition = (basePos, index, total, radius = 0.1) => {
    if (total <= 1) return basePos;

    const angle = (index / total) * Math.PI * 2;
    return [
      basePos[0] + Math.sin(angle) * radius,
      basePos[1] + Math.cos(angle) * radius,
    ];
  };
  /* ---------- PREPARE PIN POSITIONS ---------- */
  const pinGroups = {};

  objectives.forEach((obj) => {
    getObjectivePins(obj).forEach((pin) => {
      const basePos = toLeafletPos(pin.x, pin.y, mapConfig);
      const key = posKey(basePos[0], basePos[1]);

      if (!pinGroups[key]) pinGroups[key] = [];
      pinGroups[key].push({ obj, pin });
    });
  });

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
        style={{ height: "600px", backgroundColor: "#5f5f5fff" }}

      >
        <ImageOverlay
          url={mapConfig.image}
          bounds={getMapBounds(mapConfig)}
        />

        {Object.entries(pinGroups).flatMap(([groupKey, items]) =>
          items.map((item, index) => {
            const { obj, pin } = item;
            const key = getObjectiveKey(obj.questId, obj.id);
            const isChecked = checkedObjectives[key];

            const basePos = toLeafletPos(pin.x, pin.y, mapConfig);
            const finalPos = getOffsetPosition(
              basePos,
              index,
              items.length
            );

            return (
              <Marker
                key={`${key}-${pin.type}-${index}`}

                position={finalPos}
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



        <Marker
          key={"sdadwasdwd"}
          position={[0, 0]}
          icon={ICONS.done}
        ></Marker>

      </MapContainer>
    </div>
  );
};

export default MapPage;
