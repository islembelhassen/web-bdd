import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const API_URL = "http://localhost/react-php/api_chart.php";

const PALETTE = ["#667eea", "#764ba2", "#f093fb", "#4facfe", "#43e97b",
                 "#fa709a", "#fee140", "#a18cd1", "#fbc2eb", "#96fbc4"];

const CHART_TYPES = [
  { id: "bar",  label: "Barres"    },
  { id: "line", label: "Lignes"    },
  { id: "pie",  label: "Camembert" },
];

function detectAxes(columns, rows) {
  if (!columns.length || !rows.length) return { labelCol: null, valueCol: null };
  const numericCol = columns.find(col =>
    rows.every(r => r[col] !== null && r[col] !== "" && !isNaN(Number(r[col])))
  );
  const labelCol = columns.find(col => col !== numericCol) ?? columns[0];
  const valueCol = numericCol ?? columns[columns.length - 1];
  return { labelCol, valueCol };
}

function formatData(rows, labelCol, valueCol) {
  return rows.map(r => ({
    name:  String(r[labelCol] ?? ""),
    value: Number(r[valueCol] ?? 0),
  }));
}

export default function Statistiques() {
  const [prompt,    setPrompt]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [axes,      setAxes]      = useState({ labelCol: null, valueCol: null });

  async function handleSubmit() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message ?? "Erreur inconnue");
      } else {
        setAxes(detectAxes(data.columns, data.rows));
        setResult(data);
      }
    } catch (err) {
      setError("Impossible de contacter l'API : " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = result
    ? formatData(result.rows, axes.labelCol, axes.valueCol)
    : [];

  const tooltipStyle = {
    background: "#fff", border: "1px solid #e0e0e0",
    color: "#333", borderRadius: 10, fontSize: 13,
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sql-chart-wrapper {
          max-width: 900px;
          margin: 50px auto;
          padding: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .sql-chart-wrapper h2 {
          color: white;
          text-align: center;
          margin: 0 0 30px;
          font-size: 28px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        /* ── Formulaire ── */
        .sql-form {
          background: white;
          padding: 25px;
          border-radius: 15px;
          margin-bottom: 20px;
        }
        .input-group {
          margin-bottom: 20px;
        }
        .input-group label {
          display: block;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
          font-size: 16px;
        }
        .input-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }
        .input-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }
        .generate-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }
        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-spinner {
          width: 18px; height: 18px;
          border: 3px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        /* ── Erreur ── */
        .error-message {
          background: #f44336;
          color: white;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 15px;
          text-align: center;
        }

        /* ── Résultats ── */
        .result-container {
          background: white;
          border-radius: 15px;
          padding: 20px;
          margin-top: 20px;
          animation: slideIn 0.5s ease-out;
        }
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .result-header h3 {
          margin: 0;
          color: #333;
        }
        .result-count {
          font-size: 13px;
          color: #888;
        }

        /* ── SQL box ── */
        .sql-result {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          border-radius: 10px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          margin: 0 0 20px;
        }

        /* ── Contrôles axes + type ── */
        .chart-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          padding: 16px;
          background: #f8f7ff;
          border-radius: 10px;
          border: 1px solid #e8e4f8;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 140px;
        }
        .control-group label {
          font-size: 11px;
          font-weight: bold;
          color: #764ba2;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .control-group select {
          padding: 7px 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          color: #333;
          background: white;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }
        .control-group select:focus {
          border-color: #667eea;
        }
        .chart-type-btns {
          display: flex;
          gap: 8px;
        }
        .type-btn {
          padding: 7px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          color: #666;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }
        .type-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }
        .type-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-color: transparent;
          color: white;
          font-weight: bold;
        }

        /* ── Chart ── */
        .chart-area {
          margin-bottom: 20px;
        }

        /* ── Tableau ── */
        .table-toggle {
          background: none;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px 16px;
          color: #666;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        .table-toggle:hover {
          border-color: #667eea;
          color: #667eea;
        }
        .data-table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid #e0e0e0;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .data-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          letter-spacing: 0.5px;
        }
        .data-table td {
          padding: 9px 14px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
        }
        .data-table tr:nth-child(even) td {
          background: #fafafa;
        }
        .data-table tr:last-child td {
          border-bottom: none;
        }

        @media (max-width: 768px) {
          .sql-chart-wrapper {
            margin: 20px;
            padding: 20px;
          }
          .chart-controls {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="sql-chart-wrapper">
        <h2>📊 SQL Chart — Langage naturel</h2>

        {/* ── Formulaire ── */}
        <div className="sql-form">
          <div className="input-group">
            <label>Ta question en français</label>
            <textarea
              rows={3}
              placeholder="ex: Donne-moi le nombre de films par année…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
            />
          </div>
          <button className="generate-btn" onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><span className="btn-spinner" /> Génération en cours…</>
              : "🚀 Générer le graphique"}
          </button>
          {error && <div className="error-message">⚠ {error}</div>}
        </div>

        {/* ── Résultats ── */}
        {result && (
          <div className="result-container">

            {/* SQL généré */}
            <div className="result-header">
              <h3>Requête générée</h3>
              <span className="result-count">{result.count} ligne{result.count !== 1 ? "s" : ""}</span>
            </div>
            <pre className="sql-result"><code>{result.sql}</code></pre>

            {/* Contrôles */}
            <div className="chart-controls">
              <div className="control-group">
                <label>Axe X (libellé)</label>
                <select value={axes.labelCol ?? ""} onChange={e => setAxes(a => ({ ...a, labelCol: e.target.value }))}>
                  {result.columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label>Axe Y (valeur)</label>
                <select value={axes.valueCol ?? ""} onChange={e => setAxes(a => ({ ...a, valueCol: e.target.value }))}>
                  {result.columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="control-group">
                <label>Type de graphe</label>
                <div className="chart-type-btns">
                  {CHART_TYPES.map(ct => (
                    <button
                      key={ct.id}
                      className={`type-btn${chartType === ct.id ? " active" : ""}`}
                      onClick={() => setChartType(ct.id)}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Graphique */}
            <div className="chart-area">
              {chartData.length === 0 ? (
                <p style={{ textAlign: "center", color: "#aaa" }}>Aucune donnée à afficher.</p>
              ) : chartType === "bar" ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 12 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: "#555", fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : chartType === "line" ? (
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 12 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fill: "#555", fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={3}
                      dot={{ fill: "#764ba2", r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={140}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tableau données brutes */}
            <TableToggle columns={result.columns} rows={result.rows} />
          </div>
        )}
      </div>
    </>
  );
}

function TableToggle({ columns, rows }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="table-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "▲ Masquer" : "▼ Voir"} les données brutes ({rows.length} lignes)
      </button>
      {open && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>{columns.map(c => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map(c => <td key={c}>{row[c]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}