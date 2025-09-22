import { Box, LinearProgress, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { IngestionPipelineStageKey, IngestionPipelineStageKeys, IngestionPipelineStages } from '@shared/ingestion'
import { Link as RouterLink } from 'react-router-dom'
import type { RagFileAttributes } from '@shared/types'
import { Archive, BlurOn, CloudUpload, DocumentScanner, DownloadDone, ErrorOutline } from '@mui/icons-material'
import { locales } from '../../locales/locales'
import { useTranslation } from 'react-i18next'

const ProgressIcon: Record<IngestionPipelineStageKey, React.ReactNode> = {
  completed: <DownloadDone fontSize="small" />,
  error: <ErrorOutline fontSize="small" />,
  uploading: <CloudUpload fontSize="small" />,
  parsing: <DocumentScanner fontSize="small" />,
  embedding: <BlurOn fontSize="small" />,
  storing: <Archive fontSize="small" />,
}

export const RagFileInfo: React.FC<{
  file: RagFileAttributes
  link?: boolean
}> = ({ file, link = false }) => {
  const { t, i18n } = useTranslation()
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
          {t('common:added')} {new Date(file.createdAt).toLocaleString(locales[i18n.language].code)}
        </Typography>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('common:fileType')}</TableCell>
            <TableCell>{t('rag:fileSize')}</TableCell>
            <TableCell>{t('rag:fileStatus')}</TableCell>
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
      {file.pipelineStage === 'error' && file.error && (
        <Typography variant="body2" color="error">
          {t('error:errorMessage')}: {file.error}
        </Typography>
      )}
    </Paper>
  )
}
