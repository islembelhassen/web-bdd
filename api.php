<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization'); // ← manquait ça
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

loadEnv();

// ✅ Lit JSON ou FormData automatiquement
$input = json_decode(file_get_contents('php://input'), true);
$userPrompt = $input['prompt'] ?? $_POST['prompt'] ?? '';

if (empty($userPrompt)) {
    echo json_encode(['success' => false, 'message' => 'Prompt vide']);
    exit;
}

$API_KEY = $_ENV['GROQ_API_KEY'];
$API_URL = "https://api.groq.com/openai/v1/chat/completions"; // ✅ endpoint complet

$database_schema = "
Table: Film     (fid, titre, an, duree, rang,  PRIMARY KEY (fid))
Table: Personne (pid, nom, prenom,               PRIMARY KEY (pid))
Table: f_role   (fid REFERENCES Film(fid), pid REFERENCES Personne(pid), nom, PRIMARY KEY (fid, pid, nom))
Table: mes      (fid REFERENCES Film(fid), pid REFERENCES Personne(pid),       PRIMARY KEY (fid, pid))
";

$payload = [
    "model" => "llama-3.3-70b-versatile", // ✅ modèle Groq gratuit et puissant
    "messages" => [
        [
            "role" => "system",
            "content" => "Tu es un expert SQL. Génère UNIQUEMENT la requête SQL, sans explication ni balise markdown. Schéma :\n$database_schema"
        ],
        [
            "role" => "user",
            "content" => $userPrompt
        ]
    ],
    "temperature" => 0.3,
    "max_tokens" => 500
];

$ch = curl_init($API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $API_KEY",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(['success' => false, 'message' => "Erreur cURL: $curlError"]);
    exit;
}

if ($httpCode === 200) {
    $data = json_decode($response, true);
    
    $sql = trim($data['choices'][0]['message']['content']);

    // Nettoyer les éventuelles balises ```sql ... ```
    $sql = preg_replace('/^```sql\s*/i', '', $sql);
    $sql = preg_replace('/\s*```$/', '', $sql);

    echo json_encode(['success' => true, 'sql' => $sql]);
} else {
    $error = json_decode($response, true);
    $msg = $error['error']['message'] ?? "Erreur HTTP $httpCode";
    echo json_encode(['success' => false, 'message' => $msg]);
}
?>