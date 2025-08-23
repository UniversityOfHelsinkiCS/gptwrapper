import type { RagChunk } from './rag'

export type ChatToolDef = {
  name: 'document_search' | 'mock_document_search'
  input: { query: string }
  result: { files: { fileName: string; score?: number }[] }
  output: RagChunk[]
}

export type ChatToolResult = ChatToolDef['result']

export type ChatToolOutput = ChatToolDef['output']
