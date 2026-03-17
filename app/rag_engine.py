import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from typing import Optional

CHROMA_DB_DIR = "data/chroma_db/"

def process_document(file_path: str):
    """
    Extracts text from a PDF, splits it, and stores embeddings in a local Chroma DB.
    Adds the filename as metadata to allow filtering.
    """
    file_name = os.path.basename(file_path)
    
    # Load document
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    
    # Add filename to metadata
    for doc in docs:
        doc.metadata["source_file"] = file_name
    
    # Split text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100
    )
    splits = text_splitter.split_documents(docs)
    
    # Create embeddings and store in Chroma
    embeddings = OpenAIEmbeddings()
    vectorstore = Chroma.from_documents(
        documents=splits, 
        embedding=embeddings, 
        persist_directory=CHROMA_DB_DIR
    )
    return True

async def generate_chat_stream(user_query: str, active_document: Optional[str] = None):
    """
    Asynchronous generator that yields streaming responses from a RAG pipeline.
    Filters the vectorstore chunks by the active document if provided.
    """
    embeddings = OpenAIEmbeddings()
    
    # Load the existing Chroma database
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )
    
    # Setup retriever, applying metadata filter if active_document is specified
    search_kwargs = {}
    if active_document:
        search_kwargs["filter"] = {"source_file": active_document}
        
    retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
    
    # Prompt template for answering based strictly on context
    template = """Answer the question based only on the following context:
{context}

Question: {question}
"""
    prompt = ChatPromptTemplate.from_template(template)
    
    # Initialize the model with streaming enabled
    model = ChatOpenAI(model="gpt-4o-mini", streaming=True)
    
    # Helper to format retrieved documents
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
        
    # Construct the LCEL chain
    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | model
        | StrOutputParser()
    )
    
    # Stream the completion
    async for chunk in chain.astream(user_query):
        yield chunk
