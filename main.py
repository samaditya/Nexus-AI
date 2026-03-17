import os
import shutil
import warnings
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

# Suppress Pydantic V1 warnings from Langchain on Python 3.14+
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from app.rag_engine import process_document, generate_chat_stream

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware allowing all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "ok"}

class ChatRequest(BaseModel):
    prompt: str
    active_document: Optional[str] = None

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save the file temporarily
    os.makedirs("data", exist_ok=True)
    file_path = f"data/{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Process and store the document in Chroma
    process_document(file_path)
    
    return {"message": f"Successfully processed {file.filename}"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        generate_chat_stream(request.prompt, request.active_document),
        media_type="text/event-stream"
    )
