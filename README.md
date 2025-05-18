
# Xyne Rag App

Here's a complete and well-structured README.md file : 

- Project description
- Setup guide (Vespa, Ollama, app)
- Architecture explanation with system flow
- Improvement notes
- Clean markdown formatting
- Embedded system architecture diagram


# Xyne RAG: Multi-Source Google Workspace Chat with Vespa + Ollama

Xyne-RAG is a Retrieval-Augmented Generation (RAG) application that allows users to sign in with their Google account and chat with their personal workspace data. It intelligently ingests and indexes content from Google Docs, Sheets, Drive, and Calendar, and uses multi-vector retrieval via Vespa and lightweight local LLMs with Ollama to generate highly relevant answers.

--------

## ⚙️ Setup Instructions

- 📦 Clone the repository

    - git clone https://github.com/shaileshkaliya/Xyne-App.git
    - cd xyne-rag
    - npm install

- 🐋 Step 1: Set up Vespa using Docker

    Make sure Docker is installed on your machine.

    Pull Vespa official Docker image
    
    - docker pull vespaengine/vespa

    Start the Vespa container
    - docker run -d --name vespa -p 8080:8080 -p 19071:19071 vespaengine/vespa

    In another terminal, go to the Vespa app directory
    - cd vespa-app

    Deploy the app to Vespa
    - docker exec vespa bash -c "/opt/vespa/bin/vespa-deploy prepare /vespa-app && /opt/vespa/bin/vespa-deploy activate"


- 🧠 Step 2: Set up Ollama

    Download from the official site: https://ollama.com/ 
    
    Download `nomic-text-embed` model
    - ollama pull nomic-text-embed

    Download `phi4` model
    - ollama pull phi4

- 🚀 Step 3: Start the server
    - npm run dev

    Then visit: http://localhost:5173


## 🔐 OAuth2 + Data Ingestion Flow
-  User authenticates via Google OAuth 2.0
   
    Permissions: drive.readonly, documents.readonly, sheets.readonly, calendar.readonly

-  Upon success, the user is redirected to the chat interface.

-  Background ingestion begins:

    - Data is fetched from Google Docs, Sheets, and Calendar.

    - The content is:

        🔹 Chunked using overlapping strategy for context retention

        🔹 Embedded using nomic-text-embed model

        🔹 Indexed as documents in Vespa

-  Optionally, you can configure scheduled ingestion to auto-refresh and sync your knowledge base regularly.


## 💬 Question-Answer Flow
1. User types a query in chat UI

2. Query is converted into an embedding

3. Embedding is compared (cosine similarity) with stored Vespa document vectors

4. Top-K similar results are fetched

5. Fetched chunks are passed as context to the phi4 LLM

6. Final answer is generated and shown in the chat UI

    `Note: Messages are stored in sessionStorage and limited to 100 entries. When the limit is crossed, oldest messages are removed.`

----

## 🧩 System Architecture
 ! (https://github.com/shaileshkaliya/Xyne-App/blob/main/System_Architecture_Xyne.png)


## 🛠️ Tech Stack

- Backend: Node.js + Express + TypeScript
- Frontend: Vanilla JS, HTML, CSS
- Vector DB: Vespa (multi-vector schema)
- Embedding: nomic-text-embed (via Ollama)
- LLM: phi4 (via Ollama)
- OAuth: Google OAuth 2.0


## 📈 Improvements & Future Scope

- ✅ Current: Session-based message storage (limited to 100)
- 🔄 Planned: MongoDB or Redis for long-term chat persistence
- 🔄 Realtime: Add CRON/scheduler for regular ingestion updates
- 🔄 Multi-user: Extend support for multiple users and data partitioning
- 🧪 Testing: Add Jest or similar unit/integration test framework


## 🧪 Sample Queries

- What was scheduled in my calendar last week?
- Summarize my recent Google Docs notes
- List all spreadsheet files created last month
