import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useParams } from "react-router-dom";
import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

import Home from './home/home.jsx';
import AppNavbar from './Component/AppNavbar.jsx';
import SyncIndicator from './Component/SyncIndicator.jsx';
import ErrorBoundary from './Component/ErrorBoundary.jsx';
import { preloadAll } from './data/gameStore';

// เริ่มดึงข้อมูล "สด" จาก json.tarkov.dev ทันทีที่เข้าเว็บ (ขนานกับการเรนเดอร์)
// หน้าเว็บโชว์ static ก่อน แล้วสลับเป็น live เมื่อโหลด+transform เสร็จ (fallback = static ถ้าล้มเหลว)
preloadAll();

// Vite: ถ้า lazy chunk โหลดไม่ได้ (มัก = deploy เวอร์ชันใหม่ทำให้ chunk เก่าที่ browser cache ไว้ 404)
// -> reload หนึ่งครั้งให้ดึง index/chunk ล่าสุด (กัน loop ด้วย flag เดียวกับ ErrorBoundary)
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('eft_chunk_reloaded')) {
    sessionStorage.setItem('eft_chunk_reloaded', '1');
    window.location.reload();
  }
});

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

// reset ErrorBoundary เมื่อเปลี่ยนหน้า — หน้าที่ crash จะไม่ค้าง error เวลานำทางไปหน้าอื่น
function RoutedBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <AppNavbar />
      <SyncIndicator />
      <RoutedBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:pageId" element={<HandlePage />} />
        </Routes>
      </RoutedBoundary>
    </Router>
  </StrictMode>
);
