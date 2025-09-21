import { Box, LinearProgress, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { IngestionPipelineStageKey, IngestionPipelineStageKeys, IngestionPipelineStages } from '@shared/ingestion'
import { Link as RouterLink } from 'react-router-dom'
import type { RagFileAttributes } from '@shared/types'
import { Check, CloudUpload, DocumentScanner, ErrorOutline, HorizontalSplit } from '@mui/icons-material'

const ProgressIcon: Record<IngestionPipelineStageKey, React.ReactNode> = {
  completed: <Check fontSize="small" />,
  error: <ErrorOutline fontSize="small" />,
  uploading: <CloudUpload fontSize="small" />,
  parsing: <DocumentScanner fontSize="small" />,
  indexing: <HorizontalSplit fontSize="small" />,
}

export const RagFileInfo: React.FC<{
  file: RagFileAttributes
  link?: boolean
}> = ({ file, link = false }) => {
  const inProgress = file.pipelineStage !== 'completed' && file.pipelineStage !== 'error'
  const progressIdx = IngestionPipelineStageKeys.indexOf(file.pipelineStage)
  const progressNextIdx = inProgress ? progressIdx + 1 : progressIdx
  const numSteps = IngestionPipelineStageKeys.length - 2

  return (
    <Paper sx={{ padding: 2, marginBottom: 2 }} elevation={3}>
      <Box display={'flex'} width="100%">
        {link ? (
          <Link to={`/rag/${file.ragIndexId}/files/${file.id}`} component={RouterLink}>
            <Typography variant="subtitle1">{file.filename}</Typography>
          </Link>
        ) : (
          <Typography variant="subtitle1">{file.filename}</Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 'auto' }}>
          Added {new Date(file.createdAt).toLocaleString()}
        </Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Size (characters)</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{file.fileType}</TableCell>
            <TableCell>{file.fileSize}</TableCell>
            <TableCell>
              <Box display="flex" alignItems="end" gap={1}>
                {IngestionPipelineStages[file.pipelineStage]}
                {ProgressIcon[file.pipelineStage]}
              </Box>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {file.pipelineStage !== 'completed' && file.pipelineStage !== 'error' && (
        <LinearProgress variant="buffer" value={(progressIdx * 100) / numSteps} valueBuffer={(progressNextIdx * 100) / numSteps} />
      )}
      {file.error && (
        <Typography variant="body2" color="error">
          Error: {JSON.stringify(file.error)}
        </Typography>
      )}
    </Paper>
  )
}
