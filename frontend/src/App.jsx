import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import ListData from "./components/Home/ListData";
import SQLAssistant from "./components/SQLAssistant/SQLAssistant";
import Statistiques from "./components/Statistiques/Statistiques";
import "./style.css";

function App() {
  const [activePage, setActivePage] = useState("livres"); // 'livres' ou 'sql'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setIsSidebarOpen(false); // Fermer le sidebar sur mobile après navigation
  };

  return (
    <div className="app">
      {/* Bouton hamburger */}
      <button className="menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onNavigate={navigateTo} activePage={activePage} />

      {/* Overlay pour fermer le sidebar (mobile) */}
      {isSidebarOpen && <div className="overlay" onClick={toggleSidebar}></div>}

      {/* Contenu principal */}
      <main className={`main-content ${isSidebarOpen ? 'shifted' : ''}`}>
        {activePage === "livres" && <ListData />}
        {activePage === "sql" && <SQLAssistant />}
        {activePage === "statistiques" && <Statistiques />}
      </main>
    </div>
  );
}

export default App;