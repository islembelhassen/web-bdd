# SQL Chart — Langage naturel → Graphique

Pose une question en français, l'IA génère le SQL, l'exécute et affiche un graphique.

## Stack

| Côté | Techno |
|------|--------|
| Frontend | React + Vite + Recharts |
| Backend | PHP 8+ |
| LLM | Groq (gratuit) — `llama-3.3-70b-versatile` |
| BDD | MySQL |

---

## Installation

### 1. Cloner le projet

```bash
git clone 
cd 
```

### 2. Variables d'environnement PHP

Copier le fichier exemple et remplir les valeurs :

```bash
cp .env.example .env
```

Éditer `.env` :

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DB_HOST=localhost
DB_NAME=your_database
DB_USER=root
DB_PASS=
```


### 3. Installer les dépendances React

```bash
npm install
```

### 4. Lancer le frontend

```bash
npm run dev
# → http://localhost:5173
```

### 5. Placer le PHP dans ton serveur local

Copier `api_chart.php` dans ton dossier PHP :

```bash
cp api_chart.php /chemin/vers/htdocs/react-php/
# accessible sur http://localhost/react-php/api_chart.php
```

---

## Structure du projet

```

```

---

## Utilisation

1. Saisir une question en français : _"Nombre de films par année"_
2. Cliquer sur **Générer le graphique**
3. Le SQL généré s'affiche, les données sont chargées
4. Changer le type de graphe (Barres / Lignes / Camembert)
5. Ajuster les axes X/Y si besoin

---

## Sécurité

- Seules les requêtes `SELECT` sont autorisées
- Les mots-clés `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE` sont bloqués
- La clé API n'est jamais exposée côté frontend

---

## Obtenir une clé Groq gratuite

1. Aller sur [console.groq.com](https://console.groq.com)
2. Créer un compte
3. **API Keys** → **Create API Key**
4. Copier la clé dans `.env`