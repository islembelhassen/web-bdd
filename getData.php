<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require 'db.php';

try {
   
    // Récupérer toutes les tables en une seule fois
    $data = [];
    
    // Table Film
    $stmt = $pdo->query("SELECT fid, titre, an, duree, rang FROM Film");
    $data['Film'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table Personne
    $stmt = $pdo->query("SELECT pid, nom, prenom FROM Personne");
    $data['Personne'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table f_role
    $stmt = $pdo->query("SELECT fid, pid, nom FROM f_role");
    $data['f_role'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
     $stmt = $pdo->query("SELECT fid, pid FROM mes");
    $data['mes'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    

    echo json_encode([
        'success' => true,
        'data' => $data
    ]);
    
} catch(PDOException $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>