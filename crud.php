<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php'; // fournit $pdo

/**
 * SÉCURITÉ CONTRE LES INJECTIONS SQL — deux mécanismes complémentaires :
 *
 * 1) VALIDATION DES DONNÉES (validateData ci-dessous) : on vérifie le
 *    type, la longueur et les bornes de chaque valeur AVANT de l'utiliser.
 *    Ça protège l'intégrité des données, mais ce n'est PAS la vraie
 *    barrière anti-injection : un attaquant motivé peut soumettre une
 *    chaîne qui "ressemble" à une valeur valide tout en étant malveillante.
 *
 * 2) REQUÊTES PRÉPARÉES PDO (partout ci-dessous) : chaque valeur est
 *    envoyée à MySQL via un paramètre lié (?), jamais concaténée dans
 *    le texte SQL. C'est ÇA qui empêche réellement l'injection, quoi
 *    que contienne la donnée.
 *
 * Les noms de TABLE et de COLONNE ne peuvent jamais être des paramètres
 * liés en SQL (PDO ne le permet pas) : ils sont donc validés contre une
 * liste blanche stricte ($TABLES) avant d'être insérés dans la requête.
 */

function respond($payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

// ── Liste blanche des tables, colonnes et règles de validation ─────────────
$TABLES = [
    'movie' => [
        'primary_key'    => ['id_movie'],
        'auto_increment' => [],
        'columns' => [
            'id_movie' => ['type' => 'int',    'required' => true,  'min' => 1],
            'title'    => ['type' => 'string', 'required' => true,  'maxlen' => 255],
            'year'     => ['type' => 'int',    'required' => false, 'min' => 1888, 'max' => 2100, 'nullable' => true],
        ],
    ],
    'link' => [
        'primary_key'    => ['id_movie'],
        'auto_increment' => [],
        'columns' => [
            'id_movie' => ['type' => 'int',    'required' => true,  'min' => 1],
            'imdb_id'  => ['type' => 'string', 'required' => false, 'maxlen' => 20, 'nullable' => true],
            'tmdb_id'  => ['type' => 'string', 'required' => false, 'maxlen' => 20, 'nullable' => true],
        ],
    ],
    'genre' => [
        'primary_key'    => ['id_genre'],
        'auto_increment' => ['id_genre'],
        'columns' => [
            'id_genre' => ['type' => 'int',    'required' => false, 'min' => 1],
            'libelle'  => ['type' => 'string', 'required' => true,  'maxlen' => 50],
        ],
    ],
    'movie_genre' => [
        'primary_key'    => ['id_movie', 'id_genre'],
        'auto_increment' => [],
        'columns' => [
            'id_movie' => ['type' => 'int', 'required' => true, 'min' => 1],
            'id_genre' => ['type' => 'int', 'required' => true, 'min' => 1],
        ],
    ],
    'utilisateur' => [
        'primary_key'    => ['id_user'],
        'auto_increment' => [],
        'columns' => [
            'id_user'            => ['type' => 'int',      'required' => true,  'min' => 1],
            'date_premiere_note' => ['type' => 'datetime', 'required' => false, 'nullable' => true],
            'date_derniere_note' => ['type' => 'datetime', 'required' => false, 'nullable' => true],
        ],
    ],
    'profil' => [
        'primary_key'    => ['id_profil'],
        'auto_increment' => ['id_profil'],
        'columns' => [
            'id_profil'    => ['type' => 'int',   'required' => false, 'min' => 1],
            'id_user'      => ['type' => 'int',   'required' => true,  'min' => 1],
            'nb_films_vus' => ['type' => 'int',   'required' => false, 'min' => 0],
            'note_moyenne' => ['type' => 'float', 'required' => false, 'min' => 0, 'max' => 5],
        ],
    ],
    'rating' => [
        'primary_key'    => ['id_user', 'id_movie'],
        'auto_increment' => [],
        'columns' => [
            'id_user'  => ['type' => 'int',      'required' => true, 'min' => 1],
            'id_movie' => ['type' => 'int',      'required' => true, 'min' => 1],
            'rating'   => ['type' => 'float',    'required' => true, 'min' => 0.5, 'max' => 5.0],
            'rated_at' => ['type' => 'datetime', 'required' => true],
        ],
    ],
    'tag' => [
        'primary_key'    => ['id_tag'],
        'auto_increment' => ['id_tag'],
        'columns' => [
            'id_tag'  => ['type' => 'int',    'required' => false, 'min' => 1],
            'libelle' => ['type' => 'string', 'required' => true,  'maxlen' => 100],
        ],
    ],
    'movie_tag' => [
        'primary_key'    => ['id_user', 'id_movie', 'id_tag'],
        'auto_increment' => [],
        'columns' => [
            'id_user'   => ['type' => 'int',      'required' => true, 'min' => 1],
            'id_movie'  => ['type' => 'int',      'required' => true, 'min' => 1],
            'id_tag'    => ['type' => 'int',      'required' => true, 'min' => 1],
            'tagged_at' => ['type' => 'datetime', 'required' => true],
        ],
    ],
];

// ── Lecture de la requête ───────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$table  = $_GET['table'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

if (!isset($TABLES[$table])) {
    respond(['success' => false, 'message' => "Table inconnue ou non autorisée : " . htmlspecialchars($table)], 400);
}
$config = $TABLES[$table];

/**
 * Valide un tableau de données soumises contre la config d'une table.
 * Rejette tout champ absent de la liste blanche des colonnes.
 * $partial = true pour une mise à jour (les champs non fournis sont ignorés).
 * Retourne [donnees_propres, erreurs[]]
 */
function validateData(array $data, array $config, bool $partial = false): array {
    $clean  = [];
    $errors = [];

    foreach (array_keys($data) as $field) {
        if (!isset($config['columns'][$field])) {
            $errors[] = "Champ non autorisé : $field";
        }
    }

    foreach ($config['columns'] as $col => $rules) {
        $isAutoIncrement = in_array($col, $config['auto_increment'], true);
        $present = array_key_exists($col, $data);

        if (!$present) {
            if (!$partial && !empty($rules['required']) && !$isAutoIncrement) {
                $errors[] = "Champ requis manquant : $col";
            }
            continue;
        }

        $value = $data[$col];

        if ($value === null || $value === '') {
            if (!empty($rules['nullable'])) {
                $clean[$col] = null;
                continue;
            }
            if ($isAutoIncrement) continue; // laissé à MySQL (AUTO_INCREMENT)
            $errors[] = "Le champ $col ne peut pas être vide";
            continue;
        }

        switch ($rules['type']) {
            case 'int':
                if (!is_numeric($value) || (float)$value != (int)$value) {
                    $errors[] = "$col doit être un entier";
                    break;
                }
                $value = (int)$value;
                if (isset($rules['min']) && $value < $rules['min']) $errors[] = "$col doit être >= {$rules['min']}";
                if (isset($rules['max']) && $value > $rules['max']) $errors[] = "$col doit être <= {$rules['max']}";
                $clean[$col] = $value;
                break;

            case 'float':
                if (!is_numeric($value)) {
                    $errors[] = "$col doit être un nombre";
                    break;
                }
                $value = (float)$value;
                if (isset($rules['min']) && $value < $rules['min']) $errors[] = "$col doit être >= {$rules['min']}";
                if (isset($rules['max']) && $value > $rules['max']) $errors[] = "$col doit être <= {$rules['max']}";
                $clean[$col] = $value;
                break;

            case 'string':
                $value = trim((string)$value);
                $maxlen = $rules['maxlen'] ?? 255;
                if (mb_strlen($value) > $maxlen) {
                    $errors[] = "$col dépasse la longueur maximale ($maxlen caractères)";
                    break;
                }
                $clean[$col] = $value;
                break;

            case 'datetime':
                $ts = strtotime((string)$value);
                if ($ts === false) {
                    $errors[] = "$col n'est pas une date valide (format attendu : AAAA-MM-JJ HH:MM:SS)";
                    break;
                }
                $clean[$col] = date('Y-m-d H:i:s', $ts);
                break;

            default:
                $errors[] = "Type inconnu pour $col";
        }
    }

    return [$clean, $errors];
}

/** Construit la clause WHERE à partir de la clé primaire (colonnes whitelistées). */
function buildWhereFromPK(array $data, array $config): array {
    $where = [];
    $params = [];
    foreach ($config['primary_key'] as $pk) {
        if (!isset($data[$pk]) || $data[$pk] === '') {
            return [null, null, "Clé primaire manquante : $pk"];
        }
        $where[] = "`$pk` = ?";
        $params[] = $data[$pk];
    }
    return [implode(' AND ', $where), $params, null];
}

try {
    switch ($method) {

        // ───────────────────────── INSERT ─────────────────────────
        case 'POST':
            [$clean, $errors] = validateData($body, $config, false);
            if (!empty($errors)) {
                respond(['success' => false, 'message' => implode(' / ', $errors)], 422);
            }

            $columns      = array_keys($clean);
            $placeholders = implode(',', array_fill(0, count($columns), '?'));
            $colList      = implode(',', array_map(fn($c) => "`$c`", $columns));

            $sql  = "INSERT INTO `$table` ($colList) VALUES ($placeholders)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(array_values($clean));

            respond(['success' => true, 'message' => 'Ligne ajoutée', 'id' => $pdo->lastInsertId() ?: null]);
            break;

        // ───────────────────────── UPDATE ─────────────────────────
        case 'PUT':
            [$whereSql, $whereParams, $pkError] = buildWhereFromPK($body, $config);
            if ($pkError) respond(['success' => false, 'message' => $pkError], 422);

            $editable = $body;
            foreach ($config['primary_key'] as $pk) unset($editable[$pk]);

            [$clean, $errors] = validateData($editable, $config, true);
            if (!empty($errors)) {
                respond(['success' => false, 'message' => implode(' / ', $errors)], 422);
            }
            if (empty($clean)) {
                respond(['success' => false, 'message' => 'Aucune donnée à mettre à jour'], 422);
            }

            $setSql = implode(',', array_map(fn($c) => "`$c` = ?", array_keys($clean)));
            $sql    = "UPDATE `$table` SET $setSql WHERE $whereSql";
            $stmt   = $pdo->prepare($sql);
            $stmt->execute(array_merge(array_values($clean), $whereParams));

            respond(['success' => true, 'message' => 'Ligne mise à jour', 'rows_affected' => $stmt->rowCount()]);
            break;

        // ───────────────────────── DELETE ─────────────────────────
        case 'DELETE':
            [$whereSql, $whereParams, $pkError] = buildWhereFromPK($body, $config);
            if ($pkError) respond(['success' => false, 'message' => $pkError], 422);

            $sql  = "DELETE FROM `$table` WHERE $whereSql";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($whereParams);

            respond(['success' => true, 'message' => 'Ligne supprimée', 'rows_affected' => $stmt->rowCount()]);
            break;

        default:
            respond(['success' => false, 'message' => "Méthode non supportée : $method"], 405);
    }
} catch (PDOException $e) {
    $msg = $e->getCode() === '23000'
        ? "Violation de contrainte (clé étrangère ou doublon) — vérifie que les IDs liés existent et qu'il n'y a pas de doublon."
        : "Erreur SQL : " . $e->getMessage();
    respond(['success' => false, 'message' => $msg], 409);
}