import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';



import Home from './home/home.jsx';
import AddQuest from "./pages/AddQuest.jsx";  
import MapPage from "./pages/MapPage.jsx";
import Kappa from "./pages/Kappa.jsx";
import QuestTree from "./pages/QuestTree.jsx";
import Hideout from "./pages/Hideout.jsx";
import AppNavbar from './Component/AppNavbar.jsx';
import Balistic from "./pages/Balistic.jsx";

const pageComponents = {
  QuestTree: <QuestTree/>,
  Kappa: <Kappa/>,
  Map : < MapPage/>,
  AddQuest: <AddQuest/>,
  Hideout: <Hideout/>,
  Balistic: <Balistic/>,
  Default: <Home/>,
};

function HandlePage() {
  const { pageId } = useParams();
  return pageComponents[pageId] || pageComponents.Default;
}


createRoot(document.getElementById('root')).render(
  <StrictMode>

      <Router>
        <AppNavbar/>
        {/* <Navigation /> */}
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/:pageId" element={<HandlePage />} />


        </Routes>

      </Router>

  </StrictMode>
);
