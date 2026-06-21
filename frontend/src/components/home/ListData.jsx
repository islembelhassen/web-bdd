import { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import "./ListData.css";

const API_BASE = "http://localhost/web-bdd";

const NUMERIC_COLUMNS = ["id_movie", "id_genre", "id_user", "id_profil", "id_tag", "year", "rating", "nb_films_vus", "note_moyenne"];
const DATETIME_COLUMNS = ["date_premiere_note", "date_derniere_note", "rated_at", "tagged_at"];

const TABLES = [
  { name: "movie",      columns: ["id_movie", "title", "year"],                              pk: ["id_movie"],                    autoIncrement: [] },
  { name: "link",       columns: ["id_movie", "imdb_id", "tmdb_id"],                         pk: ["id_movie"],                    autoIncrement: [] },
  { name: "genre",      columns: ["id_genre", "libelle"],                                    pk: ["id_genre"],                    autoIncrement: ["id_genre"] },
  { name: "movie_genre",columns: ["id_movie", "id_genre"],                                   pk: ["id_movie", "id_genre"],        autoIncrement: [] },
  { name: "utilisateur",columns: ["id_user", "date_premiere_note", "date_derniere_note"],    pk: ["id_user"],                     autoIncrement: [] },
  { name: "profil",     columns: ["id_profil", "id_user", "nb_films_vus", "note_moyenne"],   pk: ["id_profil"],                   autoIncrement: ["id_profil"] },
  { name: "rating",     columns: ["id_user", "id_movie", "rating", "rated_at"],              pk: ["id_user", "id_movie"],         autoIncrement: [] },
  { name: "tag",        columns: ["id_tag", "libelle"],                                      pk: ["id_tag"],                      autoIncrement: ["id_tag"] },
  { name: "movie_tag",  columns: ["id_user", "id_movie", "id_tag", "tagged_at"],             pk: ["id_user", "id_movie", "id_tag"],autoIncrement: [] }
];

const getInputType = (col) => NUMERIC_COLUMNS.includes(col) ? "number" : "text";

// ─── Ligne mémorisée ────────────────────────────────────────────────────────
const TableRow = memo(({ row, columns, onEdit, onDelete }) => (
  <tr>
    {columns.map((col) => (
      <td key={col}>{row[col] !== null && row[col] !== undefined ? row[col] : "-"}</td>
    ))}
    <td className="actions-cell">
      <button className="btn-icon btn-edit"   title="Modifier"   onClick={() => onEdit(row)}>✏️</button>
      <button className="btn-icon btn-delete" title="Supprimer"  onClick={() => onDelete(row)}>🗑️</button>
    </td>
  </tr>
));

// ─── Tableau virtualisé ──────────────────────────────────────────────────────
const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 15;
const TABLE_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

const VirtualTable = memo(({ rows, columns, onEdit, onDelete }) => {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = rows.length * ROW_HEIGHT;
  const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleCount = Math.ceil(TABLE_HEIGHT / ROW_HEIGHT) + 2;
  const endIndex = Math.min(startIndex + visibleCount, rows.length);
  const visibleRows = rows.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className="virtual-scroll-container"
      ref={scrollRef}
      onScroll={handleScroll}
      style={{ height: TABLE_HEIGHT, overflowY: "auto" }}
    >
      <table border="1" className="data-table">
        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr>
            {columns.map((col) => <th key={col}>{col.toUpperCase()}</th>)}
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {/* Spacer haut */}
          {offsetY > 0 && (
            <tr style={{ height: offsetY }}>
              <td colSpan={columns.length + 1} style={{ padding: 0, border: "none" }} />
            </tr>
          )}

          {visibleRows.map((row, i) => (
            <TableRow
              key={startIndex + i}
              row={row}
              columns={columns}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}

          {/* Spacer bas */}
          {totalHeight - offsetY - visibleRows.length * ROW_HEIGHT > 0 && (
            <tr style={{ height: totalHeight - offsetY - visibleRows.length * ROW_HEIGHT }}>
              <td colSpan={columns.length + 1} style={{ padding: 0, border: "none" }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

// ─── Modal formulaire ────────────────────────────────────────────────────────
const FormModal = memo(({ mode, activeTable, config, formData, formError, submitting, onChange, onSubmit, onClose }) => {
  const columns = config.columns;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>
          {mode === "insert" ? "➕ Ajouter une ligne" : "✏️ Modifier la ligne"} — {activeTable}
        </h3>
        <form onSubmit={onSubmit}>
          {columns.map((col) => {
            const isAutoInc    = config.autoIncrement.includes(col);
            const isPk         = config.pk.includes(col);
            const lockedForEdit = mode === "edit" && isPk;

            if (mode === "insert" && isAutoInc) return null;

            return (
              <div className="form-field" key={col}>
                <label>
                  {col}
                  {isAutoInc     ? " (auto)"              : ""}
                  {lockedForEdit ? " (clé, non modifiable)" : ""}
                </label>
                <input
                  type={getInputType(col)}
                  step={col === "rating" ? "0.5" : "any"}
                  placeholder={DATETIME_COLUMNS.includes(col) ? "AAAA-MM-JJ HH:MM:SS" : ""}
                  value={formData[col] ?? ""}
                  onChange={(e) => onChange(col, e.target.value)}
                  disabled={lockedForEdit}
                  required={
                    !isAutoInc &&
                    !DATETIME_COLUMNS.includes(col) &&
                    col !== "year" &&
                    col !== "imdb_id" &&
                    col !== "tmdb_id"
                  }
                />
              </div>
            );
          })}

          {formError && <div className="error">{formError}</div>}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ─── Composant principal ─────────────────────────────────────────────────────
export default function ListData() {
  const [activeTable, setActiveTable] = useState("movie");
  const [allData, setAllData] = useState({
    movie: [], link: [], genre: [], movie_genre: [],
    utilisateur: [], profil: [], rating: [], tag: [], movie_tag: []
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  // Formulaire
  const [showForm, setShowForm]     = useState(false);
  const [formMode, setFormMode]     = useState("insert");
  const [formData, setFormData]     = useState({});
  const [formError, setFormError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/getData.php`);
      if (!response.ok) throw new Error("Erreur réseau");
      const result = await response.json();
      if (result.success) setAllData(result.data);
      else throw new Error(result.error);
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    setShowForm(false);
    setFormError("");
    setSearch("");
  }, [activeTable]);

  // ── Config table courante ──────────────────────────────────────────────────
  const currentConfig = useMemo(
    () => TABLES.find((t) => t.name === activeTable),
    [activeTable]
  );

  // ── Données filtrées ───────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const raw = allData[activeTable] || [];
    if (!search.trim()) return raw;
    const q = search.toLowerCase();
    return raw.filter((row) =>
      currentConfig.columns.some((col) =>
        String(row[col] ?? "").toLowerCase().includes(q)
      )
    );
  }, [allData, activeTable, search, currentConfig]);

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const openInsertForm = useCallback(() => {
    setFormMode("insert");
    setFormData({});
    setFormError("");
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((row) => {
    setFormMode("edit");
    setFormData({ ...row });
    setFormError("");
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setFormError("");
  }, []);

  const handleFormChange = useCallback((col, value) => {
    setFormData((prev) => ({ ...prev, [col]: value }));
  }, []);

  const handleSubmitForm = useCallback(async (e) => {
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
  }, [formMode, formData, activeTable, closeForm, fetchAllData]);

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (row) => {
    const label = currentConfig.pk.map((k) => `${k}=${row[k]}`).join(", ");
    if (!window.confirm(`Supprimer la ligne (${label}) ?`)) return;

    try {
      const pkData = {};
      currentConfig.pk.forEach((k) => { pkData[k] = row[k]; });
      const response = await fetch(`${API_BASE}/Crud.php?table=${activeTable}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkData)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Erreur lors de la suppression");
      fetchAllData();
    } catch (err) {
      setError(`Erreur : ${err.message}`);
    }
  }, [activeTable, currentConfig, fetchAllData]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="listdata-container">
      <h2>📊 Gestion de la Base de Données</h2>

      {/* Onglets tables */}
      <div className="table-tabs">
        {TABLES.map((table) => (
          <button
            key={table.name}
            className={`tab-btn ${activeTable === table.name ? "active" : ""}`}
            onClick={() => setActiveTable(table.name)}
          >
            {table.name} ({allData[table.name]?.length || 0})
          </button>
        ))}
      </div>

      <div className="data-container">
        <div className="table-header">
          <h3>Table : {activeTable}</h3>
          <div className="table-header-actions">
            <button className="btn-add"    onClick={openInsertForm}>➕ Ajouter</button>
            <button className="btn-reload" onClick={fetchAllData}>🔄 Recharger</button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={`Rechercher dans ${activeTable}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} title="Effacer">✕</button>
          )}
          {search && (
            <span className="search-count">
              {filteredData.length} / {allData[activeTable]?.length || 0} ligne{filteredData.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading && <div className="loading">Chargement…</div>}
        {error   && <div className="error">{error}</div>}

        {!loading && !error && (
          <div className="table-wrapper">
            {filteredData.length > 0 ? (
              <VirtualTable
                rows={filteredData}
                columns={currentConfig.columns}
                onEdit={openEditForm}
                onDelete={handleDelete}
              />
            ) : (
              <div className="empty-data">
                {search ? `Aucun résultat pour « ${search} »` : "Aucune donnée disponible"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <FormModal
          mode={formMode}
          activeTable={activeTable}
          config={currentConfig}
          formData={formData}
          formError={formError}
          submitting={submitting}
          onChange={handleFormChange}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      )}
    </div>
  );
}