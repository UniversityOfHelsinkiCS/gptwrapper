import { Paper, Typography } from '@mui/material'
import Markdown from 'react-markdown'

export type ChunkData = {
  title: string
  content: string
  score?: number
  metadata: Record<string, any> | null
}

export const Chunk: React.FC<{
  doc: ChunkData
}> = ({ doc }) => (
  <Paper sx={{ marginBottom: 2, p: 1 }} elevation={2}>
    {doc.score && <Typography variant="caption">Score: {doc.score}</Typography>}
    <Typography variant="subtitle1" fontFamily="monospace" mb={2}>
      {JSON.stringify(doc.metadata, null, 2)}
    </Typography>
    {doc.metadata?.type === 'md' ? (
      <Markdown>{doc.content}</Markdown>
    ) : (
      <Typography whiteSpace="pre-line" variant="body1">
        {doc.content}
      </Typography>
    )}
  </Paper>
)
