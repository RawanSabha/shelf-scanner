require('dotenv').config();
const { predictGenre } = require('./mlTrainer');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose'); // 🗄️ NEW: The Database Driver

const app = express();
const port = 5000;

// 🗄️ NEW: Connect to MongoDB Cloud
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 Connected to MongoDB Database!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// 🗄️ NEW: Define what a "Book" looks like in our database
const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  genre: String, // 🗄️ NEW: Added genre to the database schema
  scannedAt: { type: Date, default: Date.now }
});
const Book = mongoose.model('Book', bookSchema);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.array('images', 5), async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No images received" });

  try {
    console.log(`📸 Received ${req.files.length} images! Asking Gemini...`);
    const imageParts = req.files.map(file => {
      const imageData = fs.readFileSync(file.path);
      return { inlineData: { data: imageData.toString("base64"), mimeType: file.mimetype } };
    });

    const prompt = `
      Analyze the books in these images. Return ONLY a valid JSON object with this exact structure:
      {
        "scannedBooks": [{ "title": "Book Name", "author": "Author Name" }],
        "recommendations": [{ "title": "Book Name", "author": "Author Name", "reason": "Short reason." }]
      }
      Provide exactly 3 recommendations. Do not include markdown formatting.
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    let rawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const structuredData = JSON.parse(rawText);

// 🧠 NEW: Run our local ML Model on the results!
console.log("🏷️ Running local NLP model to predict genres...");
structuredData.scannedBooks = structuredData.scannedBooks.map(book => {
    const predictedGenre = predictGenre(book.title);
    return { ...book, genre: predictedGenre };
});

res.json({ message: "Analysis & ML Tagging complete!", data: structuredData });
  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    res.status(500).json({ error: "AI failed to format data." });
  }
});

// 🗄️ NEW API: Save a list of books to the Database
app.post('/api/library', async (req, res) => {
  try {
    const newBooks = req.body.books;
    await Book.insertMany(newBooks);
    console.log(`💾 Saved ${newBooks.length} books to the database.`);
    res.json({ message: "Successfully saved to your Digital Library!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save to database." });
  }
});

// 🗄️ NEW API: Fetch all saved books
app.get('/api/library', async (req, res) => {
  try {
    const myLibrary = await Book.find().sort({ scannedAt: -1 }); 
    res.json(myLibrary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch library." });
  }
});
// 🗄️ NEW API: Delete a single book by ID
app.delete('/api/library/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    await Book.findByIdAndDelete(bookId);
    console.log(`🗑️ Deleted book with ID: ${bookId}`);
    res.json({ message: "Book deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete book." });
  }
});
app.listen(port, () => {
  console.log(`🚀 Gemini Server is alive on http://localhost:${port}`);
});