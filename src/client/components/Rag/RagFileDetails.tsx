import { Box, LinearProgress, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { IngestionPipelineStageKeys, IngestionPipelineStages } from '../../../shared/constants'
import { Link as RouterLink } from 'react-router-dom'
import type { RagFileAttributes } from '../../../shared/types'

export const RagFileInfo: React.FC<{
  file: RagFileAttributes
  link?: boolean
}> = ({ file, link = false }) => {
  const inProgress = file.pipelineStage !== 'completed' && file.pipelineStage !== 'pending'
  const progressIdx = IngestionPipelineStageKeys.findIndex((stage) => stage === file.pipelineStage) - 1
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
            <TableCell>Chunks</TableCell>
            <TableCell>Meta</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>{file.fileType}</TableCell>
            <TableCell>{file.fileSize}</TableCell>
            <TableCell>{file.numChunks}</TableCell>
            <TableCell>
              <Typography variant="caption" fontFamily="monospace">
                {JSON.stringify(file.metadata)}
              </Typography>
            </TableCell>
            <TableCell>{IngestionPipelineStages[file.pipelineStage].name}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {file.pipelineStage !== 'completed' && file.pipelineStage !== 'pending' && (
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
