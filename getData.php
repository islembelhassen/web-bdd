<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require 'db.php';

try {
   
    // Récupérer toutes les tables en une seule fois
    $data = [];
    
    // Table movie
    $stmt = $pdo->query("SELECT id_movie, title, year FROM movie");
    $data['movie'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table link
    $stmt = $pdo->query("SELECT id_movie, imdb_id, tmdb_id FROM link");
    $data['link'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table genre
    $stmt = $pdo->query("SELECT id_genre, libelle FROM genre");
    $data['genre'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table movie_genre (relation N-N)
    $stmt = $pdo->query("SELECT id_movie, id_genre FROM movie_genre");
    $data['movie_genre'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table utilisateur
    $stmt = $pdo->query("SELECT id_user, date_premiere_note, date_derniere_note FROM utilisateur");
    $data['utilisateur'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table profil
    $stmt = $pdo->query("SELECT id_profil, id_user, nb_films_vus, note_moyenne FROM profil");
    $data['profil'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table rating
    $stmt = $pdo->query("SELECT id_user, id_movie, rating, rated_at FROM rating");
    $data['rating'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table tag
    $stmt = $pdo->query("SELECT id_tag, libelle FROM tag");
    $data['tag'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Table movie_tag
    $stmt = $pdo->query("SELECT id_user, id_movie, id_tag, tagged_at FROM movie_tag");
    $data['movie_tag'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

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