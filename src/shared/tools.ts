export type ChatToolDef = {
  name: 'document_search'
  input: { query: string }
  artifacts: { searchResultId: string }
}
