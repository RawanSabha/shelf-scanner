# 📚 Shelf Scanner (AI Book Assistant)
A full-stack application that captures bookshelf photos and uses AI to recommend books.

---

##  How to Start (Morning Routine)
If you just turned on your laptop, follow these steps:

### 1. Start the Backend (Server)
- Open a terminal in `/server`
- Run: `node server.js`
- *The server handles image storage on port 5000.*

### 2. Start the Frontend (Client)
- Open a terminal in `/client`
- Run: `npm run dev`
- *The website will be at http://localhost:5173.*

---

## 🛠 Project Log & Progress
- [x] **Phase 1: Setup** - Created React frontend and Node.js backend.
- [x] **Phase 2: Storage** - Configured Multer to save images to `/uploads` with readable names.
- [ ] **Phase 3: AI Brain** - Connect OpenAI GPT-4o API to "read" the book spines.
- [ ] **Phase 4: UI Update** - Display the book list back to the user in the browser.

---

## 📂 Project Structure
- `client/`: React source code (Vite).
- `server/`: Express API and Node.js logic.
- `server/uploads/`: Folder where captured images are stored.
