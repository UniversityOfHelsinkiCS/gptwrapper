# CurreChat RAG

This is a technical documentation of the RAG (retrieval-augmented generation) system used in CurreChat to help advanced users better understand and utilise it.

The overview section is meant for all users and excludes the technical descriptions.

## Overview

The overall goal is to allow the LLM chat model to refer to relevant parts of teacher-supplied source material per student-question.

The basic usage of RAG is as follows.

First, the teacher sets up the RAG:
1. Teacher creates a new Source Material Collection.
2. Teacher uploads one or more files containing text and/or images to the collection. Supported formats are any text files and PDFs.
3. CurreChat processes and indexes the file contents into small parts.
4. Teacher connects the Source Material Collection to one or more Prompts.

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
