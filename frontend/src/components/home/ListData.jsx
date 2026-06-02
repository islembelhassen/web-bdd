import { useEffect, useState } from "react";
import "./ListData.css";

export default function ListData() {
  const [activeTable, setActiveTable] = useState("Film");
  const [allData, setAllData] = useState({
    Film: [],
    Personne: [],
    f_role: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tables = [
    { name: "Film", columns: ["fid", "titre", "an", "duree", "rang"] },
    { name: "Personne", columns: ["pid", "nom", "prenom"] },
    { name: "f_role", columns: ["fid", "pid", "nom"] },
    { name: "mes", columns: ["fid", "pid",] }
  ];

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost/react-php/getData.php");
      if (!response.ok) throw new Error("Erreur réseau");
      const result = await response.json();
      
      if (result.success) {
        setAllData(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getCurrentData = () => {
    return allData[activeTable] || [];
  };

  const getColumns = () => {
    const table = tables.find(t => t.name === activeTable);
    return table ? table.columns : [];
  };

  return (
    <div className="listdata-container">
      <h2>📊 Gestion de la Base de Données</h2>

      {/* Boutons pour changer de table */}
      <div className="table-tabs">
        {tables.map((table) => (
          <button
            key={table.name}
            className={`tab-btn ${activeTable === table.name ? "active" : ""}`}
            onClick={() => setActiveTable(table.name)}
          >
            {table.name} ({allData[table.name]?.length || 0})
          </button>
        ))}
      </div>

      {/* Zone d'affichage des données */}
      <div className="data-container">
        <div className="table-header">
          <h3>Table : {activeTable}</h3>
          <button className="btn-reload" onClick={fetchAllData}>
            🔄 Recharger tout
          </button>
        </div>

        {loading && <div className="loading">Chargement...</div>}
        
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table border="1" className="data-table">
              <thead>
                <tr>
                  {getColumns().map((col) => (
                    <th key={col}>{col.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getCurrentData().length > 0 ? (
                  getCurrentData().map((row, index) => (
                    <tr key={index}>
                      {getColumns().map((col) => (
                        <td key={col}>{row[col] !== null && row[col] !== undefined ? row[col] : "-"}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={getColumns().length} className="empty-data">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}