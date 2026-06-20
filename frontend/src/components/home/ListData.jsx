import { useEffect, useState } from "react";
import "./ListData.css";
 
const API_BASE = "http://localhost/web-bdd";
 
// Colonnes numériques (affichées avec un input type="number" dans le formulaire)
const NUMERIC_COLUMNS = ["id_movie", "id_genre", "id_user", "id_profil", "id_tag", "year", "rating", "nb_films_vus", "note_moyenne"];
const DATETIME_COLUMNS = ["date_premiere_note", "date_derniere_note", "rated_at", "tagged_at"];


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
 
  // État du formulaire d'ajout / modification
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("insert"); // "insert" | "edit"
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
 
  const tables = [
    { name: "movie", columns: ["id_movie", "title", "year"], pk: ["id_movie"], autoIncrement: [] },
    { name: "link", columns: ["id_movie", "imdb_id", "tmdb_id"], pk: ["id_movie"], autoIncrement: [] },
    { name: "genre", columns: ["id_genre", "libelle"], pk: ["id_genre"], autoIncrement: ["id_genre"] },
    { name: "movie_genre", columns: ["id_movie", "id_genre"], pk: ["id_movie", "id_genre"], autoIncrement: [] },
    { name: "utilisateur", columns: ["id_user", "date_premiere_note", "date_derniere_note"], pk: ["id_user"], autoIncrement: [] },
    { name: "profil", columns: ["id_profil", "id_user", "nb_films_vus", "note_moyenne"], pk: ["id_profil"], autoIncrement: ["id_profil"] },
    { name: "rating", columns: ["id_user", "id_movie", "rating", "rated_at"], pk: ["id_user", "id_movie"], autoIncrement: [] },
    { name: "tag", columns: ["id_tag", "libelle"], pk: ["id_tag"], autoIncrement: ["id_tag"] },
    { name: "movie_tag", columns: ["id_user", "id_movie", "id_tag", "tagged_at"], pk: ["id_user", "id_movie", "id_tag"], autoIncrement: [] }
  ];
 
  const fetchAllData = async () => {
    setLoading(true);
    setError("");
 
    try {
      const response = await fetch(`${API_BASE}/getData.php`);
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
 
  // Fermer le formulaire si on change de table en cours d'édition
  useEffect(() => {
    setShowForm(false);
    setFormError("");
  }, [activeTable]);
 
  const getCurrentData = () => allData[activeTable] || [];
 
  const getCurrentTableConfig = () => tables.find((t) => t.name === activeTable);
 
  const getColumns = () => {
    const table = getCurrentTableConfig();
    return table ? table.columns : [];
  };
 
  // ───────────────────────── Formulaire ajout / édition ─────────────────────────
 
  const openInsertForm = () => {
    setFormMode("insert");
    setFormData({});
    setFormError("");
    setShowForm(true);
  };
 
  const openEditForm = (row) => {
    setFormMode("edit");
    setFormData({ ...row });
    setFormError("");
    setShowForm(true);
  };
 
  const closeForm = () => {
    setShowForm(false);
    setFormError("");
  };
 
  const handleFormChange = (col, value) => {
    setFormData((prev) => ({ ...prev, [col]: value }));
  };
 
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
 
    try {
      const method = formMode === "insert" ? "POST" : "PUT";
      const response = await fetch(`${API_BASE}/Crud.php?table=${activeTable}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
 
      if (!result.success) throw new Error(result.message || "Erreur lors de l'enregistrement");
 
      closeForm();
      fetchAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
 
  // ───────────────────────── Suppression ─────────────────────────
 
  const handleDelete = async (row) => {
    const config = getCurrentTableConfig();
    const label = config.pk.map((k) => `${k}=${row[k]}`).join(", ");
    if (!window.confirm(`Supprimer la ligne (${label}) ?`)) return;
 
    try {
      const pkData = {};
      config.pk.forEach((k) => { pkData[k] = row[k]; });
 
      const response = await fetch(`${API_BASE}/Crud.php?table=${activeTable}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkData)
      });
      const result = await response.json();
 
      if (!result.success) throw new Error(result.message || "Erreur lors de la suppression");
 
      fetchAllData();
    } catch (err) {
      setError(`Erreur: ${err.message}`);
    }
  };
 
  const getInputType = (col) => {
    if (NUMERIC_COLUMNS.includes(col)) return "number";
    return "text";
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
          <div className="table-header-actions">
            <button className="btn-add" onClick={openInsertForm}>
              ➕ Ajouter
            </button>
            <button className="btn-reload" onClick={fetchAllData}>
              🔄 Recharger tout
            </button>
          </div>
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
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentData().length > 0 ? (
                  getCurrentData().map((row, index) => (
                    <tr key={index}>
                      {getColumns().map((col) => (
                        <td key={col}>{row[col] !== null && row[col] !== undefined ? row[col] : "-"}</td>
                      ))}
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" title="Modifier" onClick={() => openEditForm(row)}>
                          ✏️
                        </button>
                        <button className="btn-icon btn-delete" title="Supprimer" onClick={() => handleDelete(row)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={getColumns().length + 1} className="empty-data">
                      Aucune donnée disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {/* Modal d'ajout / modification */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              {formMode === "insert" ? "➕ Ajouter une ligne" : "✏️ Modifier la ligne"} — {activeTable}
            </h3>
            <form onSubmit={handleSubmitForm}>
              {getColumns().map((col) => {
                const config = getCurrentTableConfig();
                const isAutoInc = config.autoIncrement.includes(col);
                const isPk = config.pk.includes(col);
                const lockedForEdit = formMode === "edit" && isPk;
 
                // En insertion, les colonnes auto-incrémentées ne sont pas saisies
                if (formMode === "insert" && isAutoInc) return null;
 
                return (
                  <div className="form-field" key={col}>
                    <label>
                      {col}
                      {isAutoInc ? " (auto)" : ""}
                      {lockedForEdit ? " (clé, non modifiable)" : ""}
                    </label>
                    <input
                      type={getInputType(col)}
                      step={col === "rating" ? "0.5" : "any"}
                      placeholder={DATETIME_COLUMNS.includes(col) ? "AAAA-MM-JJ HH:MM:SS" : ""}
                      value={formData[col] ?? ""}
                      onChange={(e) => handleFormChange(col, e.target.value)}
                      disabled={lockedForEdit}
                      required={!isAutoInc && !DATETIME_COLUMNS.includes(col) && col !== "year" && col !== "imdb_id" && col !== "tmdb_id"}
                    />
                  </div>
                );
              })}
 
              {formError && <div className="error">{formError}</div>}
 
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={closeForm}>
                  Annuler
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}