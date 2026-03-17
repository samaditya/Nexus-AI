# Enterprise Knowledge Assistant (RAG Pipeline)

A full-stack Retrieval-Augmented Generation (RAG) application that allows you to upload PDF documents and chat with them using an intelligent enterprise SaaS dashboard. The app processes the PDF by splitting the text into smaller chunks, embedding them, and storing them in a local Chroma vector database. During the chat sequence, the assistant streams generated responses using LangChain and strict metadata filtering so it only hallucinates context from the currently active document.

## 🏗 Architecture

**Backend (FastAPI, Python)**
- **Embeddings & LLM**: LangChain, OpenAI (`gpt-4o-mini`)
- **Document Ingestion**: PyPDFLoader, RecursiveCharacterTextSplitter
- **Vector Database**: ChromaDB (locally persisted)
- **Streaming**: Server-Sent Events (SSE)

**Frontend (Vite, React, JS)**
- **Framework**: React 18, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Formatting**: `react-markdown`, `remark-gfm`, and `@tailwindcss/typography` 

---

## 🚀 Setup & Installation

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- An OpenAI API Key

### 2. Backend Setup
Create your Python virtual environment and install the required dependencies:

```bash
# Clone the repository and navigate into it
git clone <your-repository-url>
cd enterprise-knowledge-assistant

# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate       # macOS / Linux
# .\venv\Scripts\activate      # Windows

# Install Python backend dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory and add your OpenAI Key:
```env
OPENAI_API_KEY=your_actual_openai_key_here
```

### 3. Frontend Setup
Navigate to the `frontend` directory and install the Node packages:
```bash
cd frontend
npm install
```

---

## 💻 Running the Application

You will need two terminal windows/tabs, one for the backend server and one for the frontend server.

### Start the Backend (FastAPI)
In Terminal 1, ensure your virtual environment is activated, then run:
```bash
# From the root directory:
uvicorn main:app --reload
```
The FastAPI backend will start running on `http://127.0.0.1:8000`. 
*(Note: Chroma vector database files will persist locally in the `data/chroma_db/` folder.)*

### Start the Frontend (Vite)
In Terminal 2, navigate to the `frontend/` folder and start the React app:
```bash
# From the root directory:
cd frontend
npm run dev
```
The React frontend will be available at `http://localhost:5173` (or `.5174` depending on your active ports).

---

## 📚 Usage Guide

1. **Open the web app**: Go to the URL provided by Vite (e.g. `http://localhost:5173`).
2. **Upload a PDF**: In the left sidebar dashboard, click the dashed box to choose your `.pdf` file.
3. **Process**: Click the **Process Document** button. The document will be loaded, chunked, and embedded into local Chroma memory.
4. **Chat**: You can now ask questions in the fluid chat interface. Responses will stream in real-time referencing *only* the specific text retrieved from the document you have currently loaded.
