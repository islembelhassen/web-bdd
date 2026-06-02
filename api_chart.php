<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

require_once 'db.php';
loadEnv();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Lecture du prompt ──────────────────────────────────────────────────────
$input      = json_decode(file_get_contents('php://input'), true);
$userPrompt = $input['prompt'] ?? $_POST['prompt'] ?? '';

if (empty($userPrompt)) {
    echo json_encode(['success' => false, 'message' => 'Prompt vide']);
    exit;
}

// ── Appel Groq → génération SQL ────────────────────────────────────────────
$API_KEY = $_ENV['GROQ_API_KEY'];
$API_URL = "https://api.groq.com/openai/v1/chat/completions";

$database_schema = "
Table: Film     (fid, titre, an, duree, rang,  PRIMARY KEY (fid))
Table: Personne (pid, nom, prenom,               PRIMARY KEY (pid))
Table: f_role   (fid REFERENCES Film(fid), pid REFERENCES Personne(pid), nom, PRIMARY KEY (fid, pid, nom))
Table: mes      (fid REFERENCES Film(fid), pid REFERENCES Personne(pid),       PRIMARY KEY (fid, pid))
";

$payload = [
    "model"    => "llama-3.3-70b-versatile",
    "messages" => [
        [
            "role"    => "system",
            "content" => "Tu es un expert SQL. Génère UNIQUEMENT une requête SELECT, sans explication, sans balise markdown, sans point-virgule final. JAMAIS de INSERT, UPDATE, DELETE, DROP, ALTER, CREATE. Schéma :\n$database_schema"
        ],
        [
            "role"    => "user",
            "content" => $userPrompt
        ]
    ],
    "temperature" => 0.2,
    "max_tokens"  => 300
];

$ch = curl_init($API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $API_KEY",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(['success' => false, 'message' => "Erreur cURL: $curlError"]);
    exit;
}

if ($httpCode !== 200) {
    $error = json_decode($response, true);
    $msg   = $error['error']['message'] ?? "Erreur API HTTP $httpCode";
    echo json_encode(['success' => false, 'message' => $msg]);
    exit;
}

$data = json_decode($response, true);
$sql  = trim($data['choices'][0]['message']['content']);

// Nettoyer les balises markdown si le LLM en met quand même
$sql = preg_replace('/^```sql\s*/i', '', $sql);
$sql = preg_replace('/^```\s*/i',    '', $sql);
$sql = preg_replace('/\s*```$/',     '', $sql);
$sql = rtrim($sql, ';');

// ── Sécurité : autoriser SELECT uniquement ─────────────────────────────────
$sqlUpper = strtoupper(ltrim($sql));
if (!str_starts_with($sqlUpper, 'SELECT')) {
    echo json_encode([
        'success' => false,
        'message' => 'Seules les requêtes SELECT sont autorisées.',
        'sql'     => $sql
    ]);
    exit;
}

// Bloquer les mots-clés dangereux même dans un SELECT
$forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC'];
foreach ($forbidden as $kw) {
    if (str_contains($sqlUpper, $kw)) {
        echo json_encode(['success' => false, 'message' => "Mot-clé interdit détecté: $kw"]);
        exit;
    }
}

// ── Exécution SQL ──────────────────────────────────────────────────────────
try {
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'sql'     => $sql,
        'columns' => count($rows) > 0 ? array_keys($rows[0]) : [],
        'rows'    => $rows,
        'count'   => count($rows)
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erreur SQL: ' . $e->getMessage(),
        'sql'     => $sql
    ]);
}
?>