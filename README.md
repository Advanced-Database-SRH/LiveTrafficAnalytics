# LiveTrafficAnalytics

Real-time traffic analytics platform combining computer vision-based object detection with a retrieval-augmented generation (RAG) layer for natural-language querying over live traffic data.

## Overview

LiveTrafficAnalytics ingests video feeds and detects/tracks vehicles, pedestrians, and traffic events in real time using a YOLO-based detection pipeline. Detected events are embedded (multimodal) and indexed in a vector store, enabling natural-language search and Q&A over traffic activity via a RAG pipeline powered by local and cloud LLM inference.

## Features

- Real-time object detection and tracking (vehicles, pedestrians, traffic events)
- Multimodal embeddings (image + metadata) for semantic search over traffic events
- RAG-based natural language querying over traffic data
- Vector similarity search for fast, relevant event retrieval
- Modular pipeline: detection → embedding → indexing → retrieval → generation

## Tech Stack

| Layer | Technology |
|---|---|
| Object Detection | YOLO |
| Vector Database | Qdrant |
| Local LLM Inference | Ollama |
| Cloud LLM Inference | Groq |
| Embeddings | Multimodal (image + text) |
| Traffic Simulation | Python |
| Database | MongoDB |
| Cache / Real-time Store | Redis |
| Backend | Node.js |
| Frontend | React (Vite) |

## Architecture

```
Python Traffic Simulation → YOLO Detection → Event Extraction
                                                    ↓
                                          Multimodal Embedding
                                                    ↓
                          MongoDB (persistence),  Qdrant Vector Store,  Redis (real-time cache)
                                                    ↓
                                    RAG Query Layer (Ollama / Groq)
                                                    ↓
                                        Node.js Backend API → React (Vite) Frontend
```

## Getting Started

### Prerequisites

- Python 3.x
- Node.js & npm
- Docker (for Qdrant / MongoDB / Redis, or local installs)
- Ollama installed locally
- Groq API key

### Installation

```bash
git clone https://github.com/monsieur-here/LiveTrafficAnalytics.git
cd LiveTrafficAnalytics
```

**Python simulation & RAG layer:**
```bash
pip install -r requirements.txt
```

**Backend (Node.js):**
```bash
cd backend
npm install
```

**Frontend (React + Vite):**
```bash
cd frontend
npm install
```

### Running dependent services

```bash
docker run -p 6333:6333 qdrant/qdrant
docker run -p 27017:27017 mongo
docker run -p 6379:6379 redis
```

### Configuration

Create a `.env` file with:

```
GROQ_API_KEY=your_key_here
QDRANT_URL=http://localhost:6333
OLLAMA_MODEL=your_model_name
MONGODB_URI=mongodb://localhost:27017/livetraffic
REDIS_URL=redis://localhost:6379
```

### Usage

**Run the traffic simulation / detection pipeline:**
```bash
python main.py
```

**Run the backend:**
```bash
cd backend
npm start
```

**Run the frontend:**
```bash
cd frontend
npm run dev
```

*[Adjust commands and ports as needed to match your actual scripts.]*

## Team
Built collaboratively as part of a team project (Apr–May 2026). RAG and vector retrieval layer developed by [monsieur-here](https://github.com/monsieur-here).
