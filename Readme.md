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
cd web-bdd
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
├── crud.php                    # Code Php pour l'ajout , suppression ,et modification de données 
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

## Architecture — flux de données

```
┌──────────────┐        fetch (CORS)        ┌──────────────────┐
│   Frontend   │ ─────────────────────────▶ │   Backend PHP     │
│  React/Vite  │ ◀───────────────────────── │   (XAMPP/Apache)  │
│ localhost:5173│         JSON               └────────┬──────────┘
└──────────────┘                                       │
                                                        │ PDO (requêtes préparées)
                                                        ▼
                                              ┌──────────────────┐
                                              │   MySQL (filmsbdd)│
                                              └──────────────────┘

Pour l'Assistant SQL / Statistiques, en plus :
  Backend PHP ──prompt français──▶ Groq API (LLM) ──SQL généré──▶ Backend PHP ──exécute──▶ MySQL
```

Trois flux distincts composent l'application :

- **Lecture simple** : `ListData.jsx` → `getData.php` → MySQL (lecture de toutes les tables d'un coup).
- **Écriture (CRUD)** : `ListData.jsx` → `Crud.php` → MySQL (insert/update/delete table par table).
- **Génération SQL par IA** : `SQLAssistant.jsx` ou `Statistiques.jsx` → `api.php`/`api_chart.php` → Groq (génère le SQL) → MySQL (exécute, pour `api_chart.php` uniquement).

---


### Backend PHP 

**`env.php`** — lit le fichier `.env` ligne par ligne et charge les variables (clé Groq, identifiants MySQL) dans `$_ENV`. Évite de coder les secrets en dur dans le code.

**`db.php`** — ouvre la connexion PDO à MySQL à partir des variables d'environnement. Active `PDO::ERRMODE_EXCEPTION` pour que toute erreur SQL lève une exception proprement gérable, plutôt que d'échouer silencieusement.

**`getData.php`** — endpoint en lecture seule. Exécute un `SELECT *` (ou équivalent) sur chacune des 9 tables et renvoie tout en un seul objet JSON. Utilisé par `ListData.jsx` au chargement de la page « Gestion de la Base de Données ».

**`api.php`** — reçoit un prompt en français, l'envoie à Groq avec le schéma de la base en contexte (system prompt), récupère la requête SQL générée et la renvoie telle quelle au frontend (sans l'exécuter). Utilisé par `SQLAssistant.jsx` — c'est un simple générateur/traducteur français → SQL.

**`api_chart.php`** — même principe que `api.php`, mais en plus : (1) il **vérifie** que la requête générée commence bien par `SELECT` et ne contient aucun mot-clé dangereux (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`, `EXEC`), puis (2) il **exécute** la requête sur MySQL et renvoie les lignes de résultat avec leurs colonnes. Utilisé par `Statistiques.jsx` pour générer les graphiques.

**`Crud.php`** — endpoint générique d'insertion/modification/suppression pour les 9 tables. Une seule liste blanche (`$TABLES`) décrit, pour chaque table : sa clé primaire (simple ou composite), ses colonnes auto-incrémentées, et les règles de validation de chaque colonne (type, obligatoire, bornes). Le routage se fait par méthode HTTP : `POST` = insertion, `PUT` = modification, `DELETE` = suppression. Toutes les valeurs passent par des requêtes préparées PDO (paramètres liés `?`), jamais par concaténation de chaînes.

**`import.php`** — script à usage unique (pas appelé par le frontend) qui lit les 4 fichiers CSV MovieLens (`movies.csv`, `links.csv`, `ratings.csv`, `tags.csv`) directement depuis le disque et peuple toutes les tables, y compris l'éclatement du champ `genres` (`Action|Adventure|...`) en lignes individuelles dans `movie_genre`.

**`schema.sql`** — script de création des 9 tables avec leurs contraintes (clés primaires, clés étrangères, `CHECK`, `UNIQUE`). Sert de référence pour le schéma relationnel mais n'est plus utilisé pour l'import des données (remplacé par `import.php`, plus fiable).



### Frontend React

**`main.jsx`** — point d'entrée, monte le composant `App` dans le DOM.

**`App.jsx`** — composant racine. Gère l'état `activePage` (quelle page afficher) et `isSidebarOpen` (menu mobile). Affiche conditionnellement `ListData`, `SQLAssistant` ou `Statistiques` selon la page active.

**`Sidebar.jsx`** — menu de navigation latéral avec 3 boutons (Données / Assistant SQL / Statistiques) qui appellent `onNavigate(page)` pour changer `activePage` dans `App.jsx`.

**`ListData.jsx`** — composant principal de gestion de données. Affiche un onglet par table, charge tout via `getData.php`, et permet l'ajout (➕), la modification (✏️) et la suppression (🗑️) de lignes via `Crud.php`. Contient une configuration (`tables`) qui décrit, côté frontend, les colonnes, clés primaires et colonnes auto-incrémentées de chaque table — en miroir de la configuration `$TABLES` côté backend.

**`SQLAssistant.jsx`** — formulaire simple : zone de texte pour la question en français, bouton qui appelle `api.php`, affiche le SQL généré avec un bouton « copier ».

**`Statistiques.jsx`** — version plus complète : appelle `api_chart.php`, détecte automatiquement quelle colonne est numérique (axe Y) et laquelle est un libellé (axe X), permet de changer les axes et le type de graphique (Recharts), et propose un bouton pour afficher les données brutes en tableau.

**Fichiers `.css` associés** (`Sidebar.css`, `ListData.css`, `SQLAssistant.css`) — styles propres à chaque composant. `Statistiques.jsx` est un cas particulier : ses styles sont injectés en ligne via une balise `<style>` dans le JSX plutôt que dans un fichier séparé.


### Base de données

Schéma relationnel normalisé, 9 tables avec trois types de relations :

- **1–1** : `utilisateur` ↔ `profil` (un profil par utilisateur), `movie` ↔ `link` (un identifiant IMDB/TMDB par film).
- **1–N** : `utilisateur` → `rating` (un utilisateur note plusieurs films), `movie` → `rating`.
- **N–N** (via table de jonction) : `movie` ↔ `genre` (par `movie_genre`), et `utilisateur` + `movie` ↔ `tag` (par `movie_tag`, jonction à 3 entités).

```
utilisateur ──1:1── profil
     │
     │ 1:N
     ▼
   rating ──N:1── movie ──1:1── link
     ▲                │
     │                │ N:N
 movie_tag ◀──N:N── movie_genre
     │                │
     ▼                ▼
    tag              genre
```

Ce découpage répond à un objectif de normalisation : éviter de répéter le titre d'un film à chaque note, garantir l'intégrité référentielle (impossible d'avoir une note pointant vers un film qui n'existe pas, grâce aux `FOREIGN KEY ... ON DELETE CASCADE`), et permettre des mises à jour ciblées sans réécrire des lignes entières.


---

## Utilisation

1. Saisir une question en français : _"Nombre de films par année"_
2. Cliquer sur **Générer le graphique**
3. Le SQL généré s'affiche, les données sont chargées
4. Changer le type de graphe (Barres / Lignes / Camembert)
5. Ajuster les axes X/Y si besoin

---

## Sécurité

**CORS** : chaque endpoint PHP envoie les en-têtes `Access-Control-Allow-Origin/Methods/Headers` et répond `200` immédiatement sur `OPTIONS`, pour que le frontend (sur un port différent) puisse l'appeler sans être bloqué par le navigateur.

**Contre les injections SQL** :
- `api_chart.php` (SQL généré par IA) : whitelist au niveau du *texte* de la requête — elle doit commencer par `SELECT`, et les mots-clés dangereux sont recherchés et bloqués.
- `Crud.php` (CRUD direct) : deux mécanismes complémentaires. La **validation** des données (type, longueur, bornes) protège l'intégrité, mais n'est pas la vraie barrière anti-injection. Ce sont les **requêtes préparées PDO** (paramètres liés `?`, jamais de concaténation) qui empêchent réellement l'injection. Les noms de table/colonne, qui ne peuvent pas être des paramètres liés en SQL, sont validés contre une liste blanche stricte avant d'être utilisés.

**Clé API** : la clé Groq reste côté serveur (`.env`, jamais envoyée au frontend) — le frontend ne voit jamais la clé, seulement le résultat.


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

### Limites du relationnel

Jointures multi-tables, schéma rigide, scalabilité horizontale limitée, calculs de similarité en O(n²), agrégations temps réel lourdes, et impossibilité de traverser un graphe de similarité efficacement en SQL.

---

### Alternatives NoSQL (conceptuel)

| Base | Modèle | Usage principal |
|------|--------|------------------|
| MongoDB | Document | Catalogue film en 1 lecture, profils |
| Neo4j | Graphe | Recommandations "vous aimerez aussi" |
| Cassandra | Colonnes | Écriture massive de ratings, stats temps réel |

**Principe** : chaque base est spécialisée pour un type de requête (lecture document, traversée de graphe, écriture distribuée).

---

### Architecture polyglotte

- **MongoDB** : fiches films et profils
- **Neo4j** : graphe de similarité utilisateurs
- **Cassandra** : ratings et historiques temps réel




## Conclusion

Ce projet combine trois briques complémentaires autour d'une même base de données MovieLens : une interface de gestion classique (lecture, ajout, modification, suppression), un assistant de génération SQL piloté par un LLM, et une couche de visualisation qui transforme directement une question en français en graphique exploitable.

Sur le plan technique, l'accent a été mis sur une séparation claire des responsabilités côté backend (un fichier par fonction : lecture, écriture, génération SQL, exécution sécurisée) et sur une sécurisation systématique des points d'entrée — requêtes préparées PDO pour toute interaction avec la base, et filtrage strict des requêtes générées par le LLM avant exécution. La réflexion sur la montée en charge (×1000) et les alternatives NoSQL complète l'exercice en questionnant les limites du modèle relationnel au-delà du périmètre immédiat du projet.

Les pistes d'évolution naturelles incluraient l'ajout d'une authentification pour restreindre les opérations de modification, la fusion des deux modes d'interrogation SQL (génération seule vs génération + exécution) en une expérience unique, et — dans une optique de montée en charge réelle — une mise en œuvre effective de tout ou partie de l'architecture polyglotte évoquée en section 6.
