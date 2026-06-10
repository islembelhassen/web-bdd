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
git clone https://github.com/islembelhassen/web-bdd.git
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
host=localhost
dbname=your_database
user=root
pass=password
```

### 3. Créer la base de données

télecharger fichiers .csv de https://grouplens.org/datasets/movielens/

suivre les instructions du schema.sql


### 4. Installer les dépendances React

```bash
npm install
```

### 5. Lancer le frontend

```bash
npm run dev
# → http://localhost:5173
```

### 6. Placer le PHP dans ton serveur local

Copier `*.php` dans ton dossier PHP :

```bash
cp *.php /chemin/vers/htdocs/react-php/

```

---

## Structure du projet

```
 projet-root/
│
├── frontend/                    # Application React (Vite)
│   ├── public/                  # Ressources statiques
│   ├── src/                     # Code source React
│   │   ├── components/          # Composants React
│   │   ├── pages/               # Pages de l'application
│   │   ├── hooks/               # Hooks personnalisés
│   │   ├── services/            # Appels API
│   │   ├── App.jsx                 # Composant principal
│   │   └── main.jsx                # Point d'entrée
│   ├── index.html                  # Page HTML principale
│   ├── package.json                # Dépendances Node.js
│   ├── package-lock.json           # Verrouillage des versions
│   ├── vite.config.js              # Configuration Vite
│   ├── eslint.config.js            # Configuration ESLint
│   ├── generate-react-cli.json     # Configuration générateur composants
│   └── .gitignore                  # Fichiers ignorés par Git
# API PHP
├── api.php                     # Point d'entrée API principal
├── api_chart.php               # API pour les graphiques
├── getData.php                 # Récupération des données
├── db.php                      # Connexion base de données
├── env.php                     # Chargement variables d'environnement
├── .env                        # Variables d'environnement (local)
└── schema.sql                  # Structure de la base de données
│
├── ml-latest-small/             # Dataset MovieLens (données locales)
│
├── Readme.md                       # Documentation du projet (ce fichier)
└── .gitignore                      # Fichiers ignorés par Git (racine)

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



## Cas forte montée en charge

### Volume simulé (×1000)

| Table | Volume |
|-------|--------|
| utilisateur | 610 000 |
| movie | 9,7 M |
| rating | 100 M |
| movie_tag | 3,6 M |
| movie_genre | 25 M |

### Requêtes critiques

3 requêtes deviennent problématiques à grande échelle : top films par genres préférés (sous-requête + 4 jointures), films similaires par tags (auto-jointure coûteuse), et note moyenne par genre/année (4 jointures + double agrégation sur 100 M lignes).

---

## Limites du relationnel

Jointures multi-tables, schéma rigide, scalabilité horizontale limitée, calculs de similarité en O(n²), agrégations temps réel lourdes, et impossibilité de traverser un graphe de similarité efficacement en SQL.

---

## Alternatives NoSQL (conceptuel)

| Base | Modèle | Usage principal |
|------|--------|------------------|
| MongoDB | Document | Catalogue film en 1 lecture, profils |
| Neo4j | Graphe | Recommandations "vous aimerez aussi" |
| Cassandra | Colonnes | Écriture massive de ratings, stats temps réel |

**Principe** : chaque base est spécialisée pour un type de requête (lecture document, traversée de graphe, écriture distribuée).

---

## 7. Architecture polyglotte

- **MongoDB** : fiches films et profils
- **Neo4j** : graphe de similarité utilisateurs
- **Cassandra** : ratings et historiques temps réel
