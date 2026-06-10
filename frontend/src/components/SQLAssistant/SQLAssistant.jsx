import { useState } from 'react';
import './SQLAssistant.css';

const SQLAssistant = () => {
  const [userInput, setUserInput] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError('');
    setSqlQuery('');

    try {
      const response = await fetch('http://localhost/web-bdd/api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: userInput }),
      });

      const data = await response.json();

      console.log('Réponse de l\'API :', data);
      
      if (data.success) {
        setSqlQuery(data.sql);
      } else {
        setError(data.message || 'Erreur lors de la génération SQL');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlQuery);
    alert('SQL copié dans le presse-papier !');
  };

  return (
    <div className="sql-assistant">
      <h2>Assistant SQL - Exprimez votre besoin</h2>
      
      <form onSubmit={handleSubmit} className="sql-form">
        <div className="input-group">
          <label htmlFor="user-need">Votre besoin en français :</label>
          <textarea
            id="user-need"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Exemple : Sélectionner tous les utilisateurs qui ont plus de 18 ans"
            rows="4"
            disabled={loading}
          />
        </div>
        
        <button type="submit" disabled={loading} className="generate-btn">
          {loading ? 'Génération en cours...' : '🚀 Générer la requête SQL'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {sqlQuery && (
        <div className="result-container">
          <div className="result-header">
            <h3>Requête SQL générée :</h3>
            <button onClick={copyToClipboard} className="copy-btn">
              📋 Copier
            </button>
          </div>
          <pre className="sql-result">
            <code>{sqlQuery}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default SQLAssistant;