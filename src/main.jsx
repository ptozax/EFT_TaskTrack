import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';



import Home from './home/home.jsx';
import AppNavbar from './Component/AppNavbar.jsx';

const pageComponents = {

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
