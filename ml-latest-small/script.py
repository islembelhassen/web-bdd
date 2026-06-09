import pandas as pd

movies = pd.read_csv("movies.csv")

# Créer une liste pour stocker les lignes du nouveau DataFrame
rows_list = []

for _, row in movies.iterrows():
    movie_id = row["movieId"]
    
    # Séparer les genres par "|" et itérer sur chaque genre
    for genre in row["genres"].split("|"):
        rows_list.append({
            "movieId": movie_id,
            "genre": genre
        })

# Créer le DataFrame à partir de la liste
movies_genre = pd.DataFrame(rows_list)

# Sauvegarder dans un fichier CSV
movies_genre.to_csv("movies_genre.csv", index=False)

print(f"Fichier créé avec {len(movies_genre)} associations film-genre")