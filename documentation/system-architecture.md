# Dalai VLLM Pipeline Architecture

This document visualizes the key pipelines in the gptwrapper/CurreChat system for embedding, chat completion, RAG, and PDF parsing.

## System Overview

```mermaid
graph TB
    subgraph Client
        UI[Web Client]
    end

    subgraph "Main Server - gptwrapper"
        API[Express API Routes]
        LangChain[LangChain Services]
        RAGService[RAG Services]
        JobService[Job Services]
    end

    subgraph "Dalai Worker"
        Worker[BullMQ Worker]
    end

    subgraph "External Services"
        Azure[Azure OpenAI]
        Laama[Laama API - Ollama/vLLM]
        Redis[(Redis)]
        PostgreSQL[(PostgreSQL)]
        S3[(S3/MinIO)]
    end

    UI --> API
    API --> LangChain
    API --> RAGService
    LangChain --> Azure
    RAGService --> Laama
    RAGService --> Redis
    JobService --> Redis
    Worker --> Redis
    Worker --> Laama
    API --> PostgreSQL
    RAGService --> S3
```

## 1. Chat Completion Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant v3Router as /api/ai/v3/stream
    participant streamChat as streamChat
    participant AzureChat as AzureChatOpenAI
    participant Tools as RAG Search Tool

    Client->>v3Router: POST /stream with messages, model, courseId
    v3Router->>v3Router: Validate user and course access
    v3Router->>v3Router: Load Prompt and RagIndex if saved prompt

    alt File Attachment
        v3Router->>v3Router: parseFileAndAddToLastMessage
    end

    v3Router->>streamChat: Start streaming
    streamChat->>streamChat: Prepare messages with system and history
    streamChat->>streamChat: Check token limits and warnings

    loop Chat Turns - max 2
        streamChat->>AzureChat: stream messages
        AzureChat-->>streamChat: Stream chunks
        streamChat-->>Client: SSE writing events

        alt Tool Calls Present
            streamChat->>Tools: invoke tool_call
            Tools-->>streamChat: Tool results
            streamChat-->>Client: SSE toolCallStatus
        end
    end

    streamChat->>v3Router: Return stats
    v3Router->>v3Router: Increment usage
    v3Router-->>Client: Close stream
```

## 2. Embedding Pipeline

```mermaid
flowchart LR
    subgraph "Embedding Service"
        Embedder[OllamaEmbeddings]
    end

    subgraph "Laama API"
        OllamaEmbed[Ollama Embedding Endpoint]
    end

    subgraph Configuration
        Config[LAAMA_API_URL<br/>LAAMA_API_TOKEN<br/>OLLAMA_EMBEDDER_MODEL]
    end

    Text[Document Chunks] --> Embedder
    Config --> Embedder
    Embedder -->|HTTP + Token Header| OllamaEmbed
    OllamaEmbed --> Vectors[1024-dim Vectors]
    Vectors --> Redis[(Redis Vector Store)]
```

### Embedder Configuration

```mermaid
graph LR
    subgraph embedder.ts
        OE[OllamaEmbeddings]
        FetchOverride[Custom fetch with token header]
    end

    ENV[Environment Variables] --> |OLLAMA_EMBEDDER_MODEL| OE
    ENV --> |LAAMA_API_URL| OE
    ENV --> |LAAMA_API_TOKEN| FetchOverride
    OE --> FetchOverride
    FetchOverride --> API[Laama API]
```

## 3. RAG Pipeline

```mermaid
flowchart TB
    subgraph "RAG Search Flow"
        Query[User Query]
        Transform[Query Transformer]

        subgraph Retrievers
            Vector[Vector Search<br/>weight: 0.4]
            Exact[Exact FT Search<br/>weight: 1.0]
            Substring[Substring FT Search<br/>weight: 0.6]
            AndFT[AND FT Search<br/>weight: 0.5]
            OrFT[OR FT Search<br/>weight: 0.4]
        end

        Ensemble[Ensemble Retriever]
        Curator[Document Curator]
        Results[Ranked Results]
    end

    Query --> Transform
    Transform --> |Multiple Queries| Retrievers
    Vector --> Ensemble
    Exact --> Ensemble
    Substring --> Ensemble
    AndFT --> Ensemble
    OrFT --> Ensemble
    Ensemble --> Curator
    Curator --> Results
```

### RAG Ingestion Pipeline

```mermaid
sequenceDiagram
    participant Upload as /rag/indices/:id/upload
    participant Ingestion as ingestRagFile
    participant FileStore as FileStore
    participant PDFJob as PDF Parsing Jobs
    participant Splitter as Text Splitter
    participant Embedder as Embedder
    participant VectorStore as RedisVectorStore

    Upload->>FileStore: Store file in S3
    Upload->>Ingestion: Start ingestion

    alt Advanced PDF Parsing
        Ingestion->>PDFJob: submitAdvancedParsingJobs
        PDFJob->>PDFJob: Add jobs to BullMQ
        Note over PDFJob: Wait for Dalai worker
        PDFJob-->>Ingestion: Page transcriptions
    else Simple PDF Parsing
        Ingestion->>Ingestion: simplyParsePdf
    end

    Ingestion->>FileStore: writeRagFileTextContent
    Ingestion->>Splitter: Split into chunks - 1000 chars, 200 overlap
    Splitter-->>Ingestion: Document chunks
    Ingestion->>Embedder: embedDocuments
    Embedder-->>Ingestion: Vectors
    Ingestion->>VectorStore: addDocuments
```

### RAG Tool Integration

```mermaid
flowchart LR
    subgraph "Chat Flow"
        Chat[Chat Model]
        Tool[document_search Tool]
    end

    subgraph "Search Service"
        Search[search function]
        Retrievers[Multiple Retrievers]
        Curator[Curator - LLM Reranking]
    end

    Chat -->|Tool Call| Tool
    Tool -->|SearchSchema| Search
    Search --> Retrievers
    Retrievers --> Curator
    Curator -->|Ranked Chunks| Tool
    Tool -->|content_and_artifact| Chat
```

## 4. PDF Parsing Pipeline

### Simple PDF Parsing (in-process)

```mermaid
flowchart LR
    PDF[PDF File] --> PDFjs[pdfjs-dist]
    PDFjs --> Pages[Page Objects]
    Pages --> Extract[extractPageText]
    Extract --> Text[Plain Text]
```

### Advanced PDF Parsing (Dalai Worker)

```mermaid
sequenceDiagram
    participant Server as gptwrapper Server
    participant Queue as BullMQ Queue vlm-queue
    participant Worker as Dalai Worker
    participant VLM as Ollama/vLLM API

    Server->>Server: analyzeAndPreparePDFPages
    Note over Server: Convert PDF pages to PNG
    Note over Server: Extract text via pdfjs

    loop For each page
        Server->>Queue: Add job with bytes, text, pageNumber
    end

    loop Process jobs
        Worker->>Queue: Get job
        alt Text >= 5000 chars
            Worker->>Worker: Skip VLM, use extracted text
        else
            alt Ollama Provider
                Worker->>VLM: POST /api/generate
            else vLLM Provider
                Worker->>VLM: POST /v1/chat/completions
            end
            VLM-->>Worker: Markdown transcription
        end
        Worker->>Queue: Complete job
    end

    Server->>Queue: Wait for all jobs
    Queue-->>Server: All transcriptions
    Server->>Server: Combine pages
```

### Dalai Worker Architecture

```mermaid
flowchart TB
    subgraph "Dalai Worker - worker.ts"
        BullMQ[BullMQ Worker<br/>concurrency: 3]

        subgraph Providers
            Ollama[transcribeWithOllama]
            VLLM[transcribeWithVLLM]
        end

        SystemPrompt[System Prompt:<br/>PDF to Markdown]
    end

    subgraph Configuration
        ENV[Environment Variables]
    end

    ENV -->|VLM_URL| Providers
    ENV -->|MODEL| Providers
    ENV -->|PROVIDER| BullMQ

    Redis[(Redis)] <-->|vlm-queue| BullMQ
    BullMQ -->|provider=ollama| Ollama
    BullMQ -->|provider=vllm| VLLM

    Ollama -->|POST /api/generate| OllamaAPI[Ollama API]
    VLLM -->|POST /v1/chat/completions| VLLMAPI[vLLM API]
```

## 5. Vector Store Schema

```mermaid
erDiagram
    REDIS_INDEX {
        TEXT content
        TEXT content_exact
        TEXT metadata
        VECTOR content_vector
    }
```

Note: `content_exact` has NOSTEM and WITHSUFFIXTRIE flags. `content_vector` uses HNSW algorithm with FLOAT32, DIM=1024, COSINE distance.

## 6. Complete Data Flow

```mermaid
flowchart TB
    subgraph "User Actions"
        Upload[Upload Document]
        Chat[Send Message]
    end

    subgraph "Document Processing"
        S3Store[Store in S3]
        Parse[Parse PDF]
        Dalai[Dalai VLM Worker]
        Chunk[Split into Chunks]
        Embed[Generate Embeddings]
        Store[Store in Redis]
    end

    subgraph "Chat Processing"
        Route[API Route]
        PrepareMsg[Prepare Messages]
        Stream[Stream to Azure]
        ToolCall[RAG Tool Call]
        VectorSearch[Vector Search]
        FTSearch[Full-text Search]
        Rerank[Curator Reranking]
        Respond[Stream Response]
    end

    Upload --> S3Store
    S3Store --> Parse
    Parse -->|Advanced| Dalai
    Parse -->|Simple| Chunk
    Dalai --> Chunk
    Chunk --> Embed
    Embed --> Store

    Chat --> Route
    Route --> PrepareMsg
    PrepareMsg --> Stream
    Stream -->|Tool Call| ToolCall
    ToolCall --> VectorSearch
    ToolCall --> FTSearch
    VectorSearch --> Rerank
    FTSearch --> Rerank
    Rerank --> Stream
    Stream --> Respond
```

## Key Configuration

| Service        | Config Variable                         | Purpose                  |
| -------------- | --------------------------------------- | ------------------------ |
| Azure OpenAI   | `AZURE_API_KEY`, `AZURE_RESOURCE`       | Chat completions         |
| Laama/Ollama   | `LAAMA_API_URL`, `LAAMA_API_TOKEN`      | Embeddings               |
| Embedder Model | `OLLAMA_EMBEDDER_MODEL`                 | Embedding model name     |
| S3 Storage     | `S3_HOST`, `S3_BUCKET`, `S3_ACCESS_KEY` | Document storage         |
| Redis          | `REDIS_HOST`, `REDIS_PORT`              | Vector store & job queue |
| BullMQ Redis   | `BMQ_REDIS_HOST`, `BMQ_REDIS_PORT`      | Job queue connection     |
| Dalai VLM      | `VLM_URL`, `MODEL`, `PROVIDER`          | Vision language model    |

## File Structure

```
src/server/
├── routes/
│   ├── ai/
│   │   ├── v3.ts           # Chat completion endpoint
│   │   └── fileParsing.ts  # File parsing utilities
│   └── rag/
│       ├── rag.ts          # RAG index CRUD
│       └── ragIndex.ts     # File upload & search
├── services/
│   ├── langchain/
│   │   ├── azure.ts        # Azure OpenAI client
│   │   └── chat.ts         # Chat streaming logic
│   ├── rag/
│   │   ├── embedder.ts     # Ollama embeddings
│   │   ├── ingestion.ts    # Document ingestion
│   │   ├── search.ts       # Search orchestration
│   │   ├── retrievers.ts   # Various retriever types
│   │   ├── vectorStore.ts  # Redis vector store
│   │   └── searchTool.ts   # LangChain tool wrapper
│   └── jobs/
│       └── pdfParsing.job.ts  # PDF job submission

dalai/
├── worker.ts               # BullMQ worker for VLM transcription
└── README.md
```
