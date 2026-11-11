import type { RagChunk } from './rag'

/** The chunks a `document_search` call found, stored by `ToolResultStore` and fetched by the client for the sources panel. */
export type ChatToolOutput = RagChunk[]
