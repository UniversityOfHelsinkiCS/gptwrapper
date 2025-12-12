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

CurreChat RAG follows an Agentic RAG paradigm: the RAG tool call in a chat context is initiated by the LLM.

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
In the case of markdown, the splitting is done on headings and section changes. Because of this, markdown can improve the quality of the results.

### Embedding

Semantic embeddings are generated for each chunk. They are generated using an embedding language model, 
which outputs a roughly 1000-dimensional semantic vector for the entire chunk. 
CurreChat uses snowflake-arctic-embed2, run on the University's servers.

### Database

The processed chunks alongside their semantic vectors are stored in a Redis database, running on the University's servers. 
A full-text-search index is created over the text content of the chunks, and a semantic vector index is created over the vectors of the chunks. 

## Retrieval

In the chat context, instead of answering directly to the user the LLM may initiate a RAG tool call. The interface the LLM has to the RAG tool is roughly as follows:
```js
{
   toolName: 'document_search',
   description: `Search documents in the materials (titled '${ragIndex.metadata.name}'). 
      Prefer ${ragIndex.metadata.language}, which is the language used in the documents. 
      If multiple queries are needed, call this tool multiple times, once for each query.`,
   schema: {
      query: 'The query to search for'
   }
}
```

A key feature to remember here is that the LLM itself comes up with the search query or multiple search queries.

The result of the tool call is added to the context of the chat. 
To perform the search to retrieve the result, a hybrid search is used. 
The search dataset contains the chunks of the Source Material Collection.

A hybrid search over the dataset is performed over the dataset using several retrieval methods in parallel:

1. Semantic similarity search using semantic vectors. An embedding vector is created from the query and cosine-similarity is used to return the most similar chunks.
2. Keyword search using several search queries:
    - Exact match
    - Substring match
    - AND of each query word occuring
    - OR of each query word occuring

For keyword search, stemming (reduction to base word form) and stop-word removal are used,
but they require the information about the language of the Source Material Collection. 
**Multilinguality in one collection is not supported.**

The results of all retrievers are merged using weighted reciprocal rank fusion, with exact match having the highest weight.

The top 15 chunks are selected from the initial retrieval step. 

Next, an experimental LLM-based _curation_ step is performed: 
each result chunk with the search query is passed to a one-shot LLM prompt using OpenAI's gpt-4o-mini.
The LLM is prompted to give a structured output containing score and a flag whether to include or exclude the chunk.
The excluded chunks are filtered from the output and the remaining chunks are ordered based on the score.
The curation step is useful to improve precision, 
although it does carry a risk of excluding relevant chunks and therefore reducing recall. 
In one example Source Material Collection, the number of resulting chunks are usually reduced from 15 to 2-4 and precision is greatly improved.

> [!NOTE]
> The retrieval pipeline is similar to a systematic literature review, where first an initial
> search query is created. Then inclusion and exclusion criteria are applied to the results of the initial query
> to improve precision. Future work could focus on dynamically generating more sophisticated
> inclusion/exclusion criteria for the curation step.
