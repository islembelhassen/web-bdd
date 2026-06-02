import "./Sidebar.css";

const Sidebar = ({ isOpen, onNavigate, activePage }) => {
  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button className="close-btn" onClick={() => onNavigate(activePage)}>
            ✕
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === "livres" ? "active" : ""}`}
            onClick={() => onNavigate("livres")}
          >
            Données
          </button>
          
          <button
            className={`nav-item ${activePage === "sql" ? "active" : ""}`}
            onClick={() => onNavigate("sql")}
          >
            Assistant SQL
          </button>

          <button
            className={`nav-item ${activePage === "statistiques" ? "active" : ""}`}
            onClick={() => onNavigate("statistiques")}
          >
            Statistiques
          </button>

        </nav>
      </div>
    </>
  );
};

export default Sidebar;