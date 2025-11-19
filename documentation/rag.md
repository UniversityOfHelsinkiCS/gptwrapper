# CurreChat RAG

This is a technical documentation of the RAG (retrieval-augmented generation) system used in CurreChat to help advanced users better understand and utilise it.

The overview section is meant for all users and excludes the technical descriptions.

This is a work-in-progress while CurreChat is being developed. Feedback is welcome.

## Overview

The overall goal is to allow the LLM chat model to refer to relevant parts of teacher-supplied source material per student-question.

The basic usage of RAG is as follows.

First, the teacher sets up the RAG:
1. Teacher creates a new Source Material Collection.
2. Teacher uploads one or more files containing text and/or images to the collection. Supported formats are any text files and PDFs.
3. CurreChat processes and indexes the file contents into small parts.
4. Teacher connects the Source Material Collection to one or more Prompts.

> [!NOTE]
> PDFs take a significantly longer time to process. If a text version of your source material is available, it is preferred. 
> Markdown is highly recommended, as the indexing process can understand the markdown structure, resulting in better section splits.

The student then uses it:

5. Student sends a message in CurreChat with the Prompt active.
6. The LLM decides whether RAG is needed to answer the student's question, based on the active Prompt.
7. The LLM forms a search string and _calls_ the RAG-tool using it.
8. The RAG search returns relevant parts of the Source Material to the LLM, which writes the answer using the results.
9. The results and search strings are also shown to the student.

> [!TIP]
> **When to use Source Materials (RAG)?**
> If your source materials are 1-2 pages in length, you can include them directly in the prompt. 
> This way the LLM always gets the full context of your materials reliably. 
> For much longer materials, the token usage rises quickly and can lead to context rot and even context limit being exceeded.
> In these cases, the RAG system (Source Materials in the UI) is more suitable.

> [!IMPORTANT]
> **How to know when CurreChat uses RAG?**
> The LLM essentially _decides_ whether a user's question requires RAG usage based on its Prompt, so it does not always use RAG even if the Prompt has Source Materials. 
> When RAG is used in an answer, the chat UI shows a message that RAG search is being performed using some search strings and once complete, the RAG search results are shown. 
> If these do not appear, RAG was not used.

## Implementation

CurreChat RAG consists of three main parts:

1. Ingestion
   - Inputted files are processed, indexed and stored in a database
2. Search
   - Given a search string, a search is performed over the database and text results are returned
3. Tool-calling
   - The search interface is made available to the chat LLM with suitable instructions

## Ingestion

CurreChat supports any text-based files such as .txt, .html or .md and PDFs to be used as source material. 
After a user uploads a file, the ingestion process starts. 

### PDF-to-text -conversion

If the file is a PDF it needs to be converted into text content. This is a non-trivial task since PDFs can contain
complex layouts and images. 
A simple solution can extract the textual content somewhat accurately but loses all layout, hierarchy and visual content and 
often fails to process special characters such as those used in mathematical equations.

For CurreChat RAG, we developed a more complex document intelligence solution that uses a VLM (vision-language model)
to parse the PDF content as an image. This allows the transferring of visual information to the textual representation.
It's downside is slow speed and the risk of hallucinations. 

The VLM we use is Qwen3:8b-vl and like CurreChat, it is run on a server operated by the University's Center for Information Technology
so no data is handled by third parties.

### Chunking

The textual content of the source files is split into small sections called chunks. 
Each chunk is roughly 1000 characters long, with an overlap of 200 characters. Chunks are split on sentence breaks with best effort. 
In the case of markdown, the splitting is done on headings and section changes.

### Embedding

Semantic embeddings are generated for each chunk. They are generated using an embedding language model, 
which outputs a roughly 1000-dimensional semantic vector for the entire chunk. 
CurreChat uses snowflake-arctic-embed2, run on the University's servers.

### Database

The processed chunks alongside their semantic vectors are stored in a Redis database, running on the University's servers. 
A full-text-search index is created over the text content of the chunks, and a semantic vector index is created over the vectors of the chunks. 

## Retrieval

