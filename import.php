<?php
/**
 * import.php
 * -----------------------------------------------------------------
 * Importe les CSV MovieLens (movies.csv, links.csv, ratings.csv, tags.csv)
 * directement dans la base filmsbdd, sans passer par des tables temporaires.
 * -----------------------------------------------------------------
 */

ini_set('memory_limit', '512M');
set_time_limit(0);
header('Content-Type: text/plain; charset=utf-8');
if (function_exists('ob_implicit_flush')) {
    ob_implicit_flush(true);
}
ob_end_flush();

require_once 'db.php'; // fournit $pdo (PDO déjà connecté)

// ───────────────────────────── CONFIG ─────────────────────────────
$csvDir = __DIR__ . '/ml-latest-small/'; // <-- adapte ce chemin si besoin
$TRUNCATE_BEFORE_IMPORT = true;
$BATCH_SIZE = 500;
// ────────────────────────────────────────────────────────────────────

function log_step(string $msg): void {
    echo "[" . date('H:i:s') . "] $msg\n";
}

function require_csv(string $path): void {
    if (!file_exists($path)) {
        die("ERREUR : fichier introuvable -> $path\n");
    }
}

function read_csv_rows(string $path): array {
    require_csv($path);
    $rows = [];
    $handle = fopen($path, 'r');
    fgetcsv($handle); // skip header
    while (($row = fgetcsv($handle)) !== false) {
        $rows[] = $row;
    }
    fclose($handle);
    return $rows;
}

/**
 * Insère $rows par paquets de $batchSize dans $table.
 * $rows = tableau de tableaux indexés (mêmes colonnes que $columns).
 */
function batch_insert(PDO $pdo, string $table, array $columns, array $rows, int $batchSize, bool $ignore = true): int {
    if (empty($rows)) return 0;
    $ignoreSql = $ignore ? 'IGNORE' : '';
    $colList = implode(',', $columns);
    $placeholderOne = '(' . implode(',', array_fill(0, count($columns), '?')) . ')';
    $total = 0;

    foreach (array_chunk($rows, $batchSize) as $chunk) {
        $placeholders = implode(',', array_fill(0, count($chunk), $placeholderOne));
        $sql = "INSERT $ignoreSql INTO $table ($colList) VALUES $placeholders";
        $stmt = $pdo->prepare($sql);
        $params = [];
        foreach ($chunk as $r) {
            foreach ($r as $v) $params[] = $v;
        }
        $stmt->execute($params);
        $total += count($chunk);
    }
    return $total;
}

// ───────────────────────────── TRUNCATE ─────────────────────────────
if ($TRUNCATE_BEFORE_IMPORT) {
    log_step("Nettoyage des tables existantes...");
    $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
    foreach (['movie_tag','rating','movie_genre','profil','link','tag','genre','movie','utilisateur'] as $t) {
        $pdo->exec("TRUNCATE TABLE $t");
    }
    $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
    log_step("Tables vidées.");
}

// ───────────────────────────── GENRES (liste fixe) ───────────────────
log_step("Insertion des genres...");
$genresFixed = ['Action','Adventure','Animation','Children','Comedy','Crime','Documentary',
    'Drama','Fantasy','Film-Noir','Horror','Musical','Mystery','Romance','Sci-Fi',
    'Thriller','War','Western','(no genres listed)'];
$genreRows = array_map(fn($g) => [$g], $genresFixed);
batch_insert($pdo, 'genre', ['libelle'], $genreRows, $BATCH_SIZE);

$genreMap = [];
foreach ($pdo->query("SELECT id_genre, libelle FROM genre") as $g) {
    $genreMap[$g['libelle']] = $g['id_genre'];
}
log_step(count($genreMap) . " genres en base.");

// ───────────────────────────── MOVIES + MOVIE_GENRE ──────────────────
log_step("Lecture de movies.csv...");
$movieRowsCsv = read_csv_rows($csvDir . 'movies.csv');
log_step(count($movieRowsCsv) . " films trouvés.");

$movieBatch = [];
$movieGenreBatch = [];
foreach ($movieRowsCsv as [$movieId, $title, $genres]) {
    $year = null;
    if (preg_match('/\((\d{4})\)\s*$/', $title, $m)) {
        $year = (int)$m[1];
    }
    $cleanTitle = trim(preg_replace('/\s*\(\d{4}\)\s*$/', '', $title));
    $movieBatch[] = [$movieId, $cleanTitle, $year];

    foreach (explode('|', $genres) as $g) {
        $g = trim($g);
        if (isset($genreMap[$g])) {
            $movieGenreBatch[] = [$movieId, $genreMap[$g]];
        }
    }
}
$n = batch_insert($pdo, 'movie', ['id_movie','title','year'], $movieBatch, $BATCH_SIZE);
log_step("$n films insérés.");
$n = batch_insert($pdo, 'movie_genre', ['id_movie','id_genre'], $movieGenreBatch, $BATCH_SIZE);
log_step("$n associations movie_genre insérées.");

// ───────────────────────────── LINKS ──────────────────────────────────
log_step("Lecture de links.csv...");
$linkRowsCsv = read_csv_rows($csvDir . 'links.csv');
$linkBatch = [];
foreach ($linkRowsCsv as [$movieId, $imdbId, $tmdbId]) {
    $linkBatch[] = [$movieId, $imdbId, $tmdbId !== '' ? $tmdbId : null];
}
$n = batch_insert($pdo, 'link', ['id_movie','imdb_id','tmdb_id'], $linkBatch, $BATCH_SIZE);
log_step("$n liens insérés.");

// ───────────────────────────── RATINGS ────────────────────────────────
log_step("Lecture de ratings.csv...");
$ratingRowsCsv = read_csv_rows($csvDir . 'ratings.csv');
log_step(count($ratingRowsCsv) . " notes trouvées.");

$users = [];
foreach ($ratingRowsCsv as [$userId, , , ]) {
    $users[$userId] = true;
}

// ───────────────────────────── TAGS ───────────────────────────────────
log_step("Lecture de tags.csv...");
$tagRowsCsv = file_exists($csvDir . 'tags.csv') ? read_csv_rows($csvDir . 'tags.csv') : [];
log_step(count($tagRowsCsv) . " tags trouvés.");

foreach ($tagRowsCsv as [$userId, , , ]) {
    $users[$userId] = true;
}

// ───────────────────────────── UTILISATEUR ────────────────────────────
$userBatch = array_map(fn($id) => [$id], array_keys($users));
$n = batch_insert($pdo, 'utilisateur', ['id_user'], $userBatch, $BATCH_SIZE);
log_step("$n utilisateurs insérés.");

// ───────────────────────────── RATING (insertion) ─────────────────────
$ratingBatch = [];
foreach ($ratingRowsCsv as [$userId, $movieId, $rating, $timestamp]) {
    $ratingBatch[] = [$userId, $movieId, $rating, date('Y-m-d H:i:s', (int)$timestamp)];
}
$n = batch_insert($pdo, 'rating', ['id_user','id_movie','rating','rated_at'], $ratingBatch, $BATCH_SIZE);
log_step("$n notes insérées.");

// ───────────────────────────── TAG (dictionnaire) ──────────────────────
$distinctTags = [];
foreach ($tagRowsCsv as [, , $tag, ]) {
    $distinctTags[$tag] = true;
}
$tagBatch = array_map(fn($t) => [$t], array_keys($distinctTags));
$n = batch_insert($pdo, 'tag', ['libelle'], $tagBatch, $BATCH_SIZE);
log_step("$n tags distincts insérés.");

$tagMap = [];
foreach ($pdo->query("SELECT id_tag, libelle FROM tag") as $t) {
    $tagMap[$t['libelle']] = $t['id_tag'];
}

// ───────────────────────────── MOVIE_TAG ────────────────────────────────
$movieTagBatch = [];
foreach ($tagRowsCsv as [$userId, $movieId, $tag, $timestamp]) {
    if (!isset($tagMap[$tag])) continue;
    $movieTagBatch[] = [$userId, $movieId, $tagMap[$tag], date('Y-m-d H:i:s', (int)$timestamp)];
}
$n = batch_insert($pdo, 'movie_tag', ['id_user','id_movie','id_tag','tagged_at'], $movieTagBatch, $BATCH_SIZE);
log_step("$n movie_tag insérés.");

// ───────────────────────────── DATES UTILISATEUR ────────────────────────
log_step("Calcul des dates première/dernière note...");
$pdo->exec("
    UPDATE utilisateur u
    JOIN (
        SELECT id_user, MIN(rated_at) AS first_rate, MAX(rated_at) AS last_rate
        FROM rating
        GROUP BY id_user
    ) r ON u.id_user = r.id_user
    SET u.date_premiere_note = r.first_rate,
        u.date_derniere_note = r.last_rate
");

// ───────────────────────────── PROFIL ─────────────────────────────────
log_step("Calcul des profils (nb_films_vus, note_moyenne)...");
$pdo->exec("
    INSERT INTO profil (id_user, nb_films_vus, note_moyenne)
    SELECT id_user, COUNT(*), AVG(rating)
    FROM rating
    GROUP BY id_user
");

log_step("✅ Import terminé avec succès.");