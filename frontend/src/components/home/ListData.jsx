import { useEffect, useState } from "react";
import "./ListData.css";

export default function ListData() {
  const [activeTable, setActiveTable] = useState("movie");
  const [allData, setAllData] = useState({
    movie: [],
    link: [],
    genre: [],
    movie_genre: [],
    utilisateur: [],
    profil: [],
    rating: [],
    tag: [],
    movie_tag: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const tables = [
    { name: "movie", columns: ["id_movie", "title", "year"] },
    { name: "link", columns: ["id_movie", "imdb_id", "tmdb_id"] },
    { name: "genre", columns: ["id_genre", "libelle"] },
    { name: "movie_genre", columns: ["id_movie", "id_genre"] },
    { name: "utilisateur", columns: ["id_user", "date_premiere_note", "date_derniere_note"] },
    { name: "profil", columns: ["id_profil", "id_user", "nb_films_vus", "note_moyenne"] },
    { name: "rating", columns: ["id_user", "id_movie", "rating", "rated_at"] },
    { name: "tag", columns: ["id_tag", "libelle"] },
    { name: "movie_tag", columns: ["id_user", "id_movie", "id_tag", "tagged_at"] }
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