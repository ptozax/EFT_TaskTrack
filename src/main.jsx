import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useParams } from "react-router-dom";
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

import Home from './home/home.jsx';
import AppNavbar from './Component/AppNavbar.jsx';

// lazy-load แต่ละหน้า -> โหลดเฉพาะหน้าที่เปิด (lib หนักอย่าง leaflet/tesseract/d3 ถูกแยก chunk ตามหน้า)
const AddQuest = lazy(() => import("./pages/AddQuest.jsx"));
const MapPage = lazy(() => import("./pages/MapPage.jsx"));
const Kappa = lazy(() => import("./pages/Kappa.jsx"));
const QuestTree = lazy(() => import("./pages/QuestTree.jsx"));
const Hideout = lazy(() => import("./pages/Hideout.jsx"));
const Balistic = lazy(() => import("./pages/Balistic.jsx"));
const ItemPrice = lazy(() => import("./pages/ItemPrice.jsx"));
const WeaponBuild = lazy(() => import("./pages/WeaponBuild.jsx"));
const WeaponOptimizer = lazy(() => import("./pages/WeaponOptimizer.jsx"));
const CaliberOptimizer = lazy(() => import("./pages/CaliberOptimizer.jsx"));
const PriceList = lazy(() => import("./pages/PriceList.jsx"));
const GearPreview = lazy(() => import("./pages/GearPreview.jsx"));

const pageComponents = {
  ItemPrice: <ItemPrice />,
  QuestTree: <QuestTree />,
  Kappa: <Kappa />,
  Map: <MapPage />,
  AddQuest: <AddQuest />,
  Hideout: <Hideout />,
  Balistic: <Balistic />,
  WeaponBuild: <WeaponBuild />,
  WeaponOptimizer: <WeaponOptimizer />,
  CaliberOptimizer: <CaliberOptimizer />,
  PriceList: <PriceList />,
  GearPreview: <GearPreview />,
  Default: <Home />,
};

const Loading = () => (
  <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>Loading…</div>
);

function HandlePage() {
  const { pageId } = useParams();
  return (
    <Suspense fallback={<Loading />}>
      {pageComponents[pageId] || pageComponents.Default}
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AppNavbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:pageId" element={<HandlePage />} />
      </Routes>
    </Router>
  </StrictMode>
);
