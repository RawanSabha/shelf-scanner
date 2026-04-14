from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import pandas as pd

app = FastAPI()

# Allow React to talk to Python
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 🗄️ CONNECT TO MONGODB (Paste your string inside the quotes!)
MONGO_URI = "mongodb+srv://rawansabha2004_db_user:4OJU6M3Ez3V7eKss@shelfscanner.fwsgivp.mongodb.net/?appName=ShelfScanner"
client = MongoClient(MONGO_URI)
db = client.test # This uses the default 'test' database
books_collection = db.books

# 📚 OUR "BOOK UNIVERSE" (The database of books we can recommend)
book_universe = pd.DataFrame([
    {"title": "Dune", "author": "Frank Herbert", "genre": "Sci-Fi & Fantasy space stars planet"},
    {"title": "Neuromancer", "author": "William Gibson", "genre": "Technology & Engineering code network future"},
    {"title": "The Bell Jar", "author": "Sylvia Plath", "genre": "Sociology & Feminism women society"},
    {"title": "Pride and Prejudice", "author": "Jane Austen", "genre": "Classic Fiction romance novel society"},
    {"title": "Clean Code", "author": "Robert C. Martin", "genre": "Technology & Engineering code software"},
    {"title": "Foundation", "author": "Isaac Asimov", "genre": "Sci-Fi & Fantasy space galaxy"},
    {"title": "Feminism is for Everybody", "author": "bell hooks", "genre": "Sociology & Feminism equality race class"},
    # Expanded dataset
    {"title": "Sapiens: A Brief History of Humankind", "author": "Yuval Noah Harari", "genre": "History & Politics evolution science"},
    {"title": "A Brief History of Time", "author": "Stephen Hawking", "genre": "Science & Mathematics physics space universe"},
    {"title": "Educated", "author": "Tara Westover", "genre": "Biography & Autobiography childhood history personal"},
    {"title": "The Pragmatic Programmer", "author": "Andrew Hunt", "genre": "Technology & Engineering coding software development"},
    {"title": "Thinking, Fast and Slow", "author": "Daniel Kahneman", "genre": "Science & Mathematics mind psychology"},
    {"title": "To Kill a Mockingbird", "author": "Harper Lee", "genre": "Classic Fiction society race literature"},
    {"title": "The Diary of a Young Girl", "author": "Anne Frank", "genre": "Biography & Autobiography personal history diary"}
])

@app.get("/")
def read_root():
    return {"message": "🧠 Python k-NN Recommender is running!"}

@app.get("/api/smart-recommend")
def get_smart_recommendations():
    # 1. Fetch the user's saved books from MongoDB
    user_books = list(books_collection.find({}, {"_id": 0, "title": 1, "genre": 1}))
    
    if len(user_books) == 0:
        return {"recommendations": [{"title": "Scan more books!", "author": "System", "reason": "We need more data to know what you like."}]}

    owned_titles = [book.get("title") for book in user_books]

    # 2. Build a "User Profile" string combining all their genres
    user_profile_text = " ".join([book.get("genre", "") for book in user_books])

    # 3. Use k-NN to find the closest thematic matches
    vectorizer = TfidfVectorizer()
    
    # Fit vectorizer mapping the entire known "universe" of books
    universe_vectors = vectorizer.fit_transform(book_universe["genre"].tolist())
    
    # Train the k-Nearest Neighbors model
    knn = NearestNeighbors(n_neighbors=len(book_universe), metric='cosine')
    knn.fit(universe_vectors)
    
    # Vectorize the user's aggregated profile text
    user_vector = vectorizer.transform([user_profile_text])
    
    # Query the nearest neighbors to the user's profile
    distances, indices = knn.kneighbors(user_vector)
    
    recommendations = []
    
    # indices[0] provides the indices sorted from closest match to furthest match
    for i, idx in enumerate(indices[0]):
        dist = distances[0][i]
        
        # metric='cosine' means distance. Simlarity is roughly 1 - distance.
        similarity_score = 1 - dist
        match = book_universe.iloc[idx]
        
        # Only recommend if they do not own it and there's a somewhat decent score
        if similarity_score > 0.01 and match["title"] not in owned_titles:
            recommendations.append({
                "title": match["title"],
                "author": match["author"],
                "reason": f"k-NN algorithmic match: {round(similarity_score * 100)}% thematic alignment."
            })
            
        # Target top 3 recommendations
        if len(recommendations) >= 3:
            break
            
    if not recommendations:
         return {"recommendations": [{"title": "Wildcard", "author": "Try something new", "reason": "You've read all our best matches! Time to explore a new genre."}]}

    return {"recommendations": recommendations}