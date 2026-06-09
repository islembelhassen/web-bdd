--- CREATION DE BASE DE DONNEES

CREATE DATABASE IF NOT EXISTS filmsBDD
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE filmsBDD;


-- UTILISATEUR

CREATE TABLE utilisateur (
    id_user             INT UNSIGNED PRIMARY KEY,
    date_premiere_note  DATETIME,
    date_derniere_note  DATETIME
);


-- PROFIL  (1–1 avec utilisateur)

CREATE TABLE profil (
    id_profil       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_user         INT UNSIGNED NOT NULL UNIQUE,   -- UNIQUE = 1-1
    nb_films_vus    INT UNSIGNED DEFAULT 0,
    note_moyenne    FLOAT        DEFAULT 0.0,
    FOREIGN KEY (id_user) REFERENCES utilisateur(id_user)
        ON DELETE CASCADE
);


-- MOVIE

CREATE TABLE movie (
    id_movie  INT UNSIGNED PRIMARY KEY,
    title     VARCHAR(255) NOT NULL,
    year      YEAR
);


-- LINK  (1–1 avec movie)

CREATE TABLE link (
    id_movie  INT UNSIGNED PRIMARY KEY,            -- PK = UNIQUE = 1-1
    imdb_id   VARCHAR(20),
    tmdb_id   VARCHAR(20),
    FOREIGN KEY (id_movie) REFERENCES movie(id_movie)
        ON DELETE CASCADE
);


-- GENRE

CREATE TABLE genre (
    id_genre  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    libelle   VARCHAR(50) NOT NULL UNIQUE
);


-- MOVIE_GENRE  (N–N entre movie et genre)

CREATE TABLE movie_genre (
    id_movie  INT UNSIGNED NOT NULL,
    id_genre  INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_movie, id_genre),
    FOREIGN KEY (id_movie)  REFERENCES movie(id_movie)  ON DELETE CASCADE,
    FOREIGN KEY (id_genre)  REFERENCES genre(id_genre)  ON DELETE CASCADE
);


-- RATING  (1–N : user → ratings, movie → ratings)

CREATE TABLE rating (
    id_user    INT UNSIGNED  NOT NULL,
    id_movie   INT UNSIGNED  NOT NULL,
    rating     DECIMAL(2,1)  NOT NULL CHECK (rating BETWEEN 0.5 AND 5.0),
    rated_at   DATETIME      NOT NULL,
    PRIMARY KEY (id_user, id_movie),
    FOREIGN KEY (id_user)  REFERENCES utilisateur(id_user) ON DELETE CASCADE,
    FOREIGN KEY (id_movie) REFERENCES movie(id_movie)      ON DELETE CASCADE
);


-- TAG

CREATE TABLE tag (
    id_tag   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    libelle  VARCHAR(100) NOT NULL UNIQUE
);


-- MOVIE_TAG  (N–N : movie ↔ tag, posé par un user)
 
CREATE TABLE movie_tag (
    id_user   INT UNSIGNED NOT NULL,
    id_movie  INT UNSIGNED NOT NULL,
    id_tag    INT UNSIGNED NOT NULL,
    tagged_at DATETIME     NOT NULL,
    PRIMARY KEY (id_user, id_movie, id_tag),
    FOREIGN KEY (id_user)  REFERENCES utilisateur(id_user) ON DELETE CASCADE,
    FOREIGN KEY (id_movie) REFERENCES movie(id_movie)      ON DELETE CASCADE,
    FOREIGN KEY (id_tag)   REFERENCES tag(id_tag)          ON DELETE CASCADE
);


--- INSERTION DE DONNES A PARTIR DE FICHIERS CSV

-- CREATE TEMP TABLES AND INSERT DATA

CREATE TABLE movies_csv (
    movieId INT,
    title VARCHAR(255),
    genres VARCHAR(255)
);

CREATE TABLE links_csv (
    movieId INT,
    imdbId VARCHAR(20),
    tmdbId VARCHAR(20)
);

CREATE TABLE ratings_csv (
    userId INT,
    movieId INT,
    rating DECIMAL(2,1),
    timestamp BIGINT
);

CREATE TABLE tags_csv (
    userId INT,
    movieId INT,
    tag VARCHAR(100),
    timestamp BIGINT
);

-- import CSV data into temporary tables


-- INSERT INTO REAL TABLES

INSERT INTO movie(id_movie, title, year)
SELECT
    movieId,
    REGEXP_REPLACE(title, ' \\([0-9]{4}\\)$', ''),
    CAST(
        REGEXP_SUBSTR(title, '[0-9]{4}')
        AS UNSIGNED
    )
FROM movies_csv;

INSERT INTO link(id_movie, imdb_id, tmdb_id)
SELECT
    movieId,
    imdbId,
    tmdbId
FROM links_csv;

INSERT INTO utilisateur(id_user)
SELECT DISTINCT userId
FROM ratings_csv;

INSERT IGNORE INTO utilisateur(id_user)
SELECT DISTINCT userId
FROM tags_csv;


INSERT INTO rating(
    id_user,
    id_movie,
    rating,
    rated_at
)
SELECT
    userId,
    movieId,
    rating,
    FROM_UNIXTIME(timestamp)
FROM ratings_csv;

UPDATE utilisateur u
JOIN (
    SELECT
        id_user,
        MIN(rated_at) AS first_rate,
        MAX(rated_at) AS last_rate
    FROM rating
    GROUP BY id_user
) r
ON u.id_user = r.id_user
SET
    u.date_premiere_note = r.first_rate,
    u.date_derniere_note = r.last_rate;
    
    
INSERT IGNORE INTO genre(libelle)
VALUES
('Action'),
('Adventure'),
('Animation'),
('Children'),
('Comedy'),
('Crime'),
('Documentary'),
('Drama'),
('Fantasy'),
('Film-Noir'),
('Horror'),
('Musical'),
('Mystery'),
('Romance'),
('Sci-Fi'),
('Thriller'),
('War'),
('Western'),
('(no genres listed)');

INSERT INTO movie_genre (id_movie, id_genre)
SELECT 
    mgc.movieId,
    g.id_genre
FROM movie_genre_csv mgc
INNER JOIN genre g ON g.libelle = mgc.genre;

INSERT INTO tag(libelle)
SELECT DISTINCT tag
FROM tags_csv;


INSERT INTO movie_tag(
    id_user,
    id_movie,
    id_tag,
    tagged_at
)
SELECT
    t.userId,
    t.movieId,
    tg.id_tag,
    FROM_UNIXTIME(t.timestamp)
FROM tags_csv t
JOIN tag tg
ON tg.libelle = t.tag;

INSERT INTO profil(
    id_user,
    nb_films_vus,
    note_moyenne
)
SELECT
    id_user,
    COUNT(*),
    AVG(rating)
FROM rating
GROUP BY id_user;