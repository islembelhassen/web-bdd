<?php
require_once 'env.php';
loadEnv();


$host = $_ENV['host'];
$dbname = $_ENV['dbname'];
$user = $_ENV['user'];
$pass = $_ENV['pass'];

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion à la base : " . $e->getMessage());
}

?>