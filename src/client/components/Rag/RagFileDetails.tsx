import { Box, Link, Paper, styled, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { IngestionJobStatus, IngestionPipelineStageKey } from '@shared/ingestion'
import { Link as RouterLink } from 'react-router-dom'
import type { RagFileAttributes } from '@shared/types'
import CloudUpload from '@mui/icons-material/CloudUpload'
import DownloadDone from '@mui/icons-material/DownloadDone'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import PendingOutlined from '@mui/icons-material/PendingOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import { locales } from '../../locales/locales'
import { useTranslation } from 'react-i18next'
import { formatDistanceStrict } from 'date-fns'
import { CircularProgressWithLabel } from '../common/CircularProgressWithLabel'

type FileStage = IngestionPipelineStageKey | 'uploading' | 'queued'

const CustomSpinner = styled(SettingsOutlined)`
  @keyframes spin {
    0%,
    10% {
      transform: rotate(0deg);
    }
    90%,
    100% {
      transform: rotate(60deg);
    }
  }
  animation: 1s ease infinite spin;
`

const ProgressIcon: Record<FileStage, React.ReactNode> = {
  completed: <DownloadDone />,
  error: <ErrorOutline />,
  ingesting: <CustomSpinner />,
  uploading: <CloudUpload />,
  queued: <PendingOutlined />,
}

export const RagFileInfo: React.FC<{
  file: RagFileAttributes
  index: number
  status?: IngestionJobStatus
  uploadProgress?: number
}> = ({ file, index, status, uploadProgress }) => {
  const { t, i18n } = useTranslation()

  const pipelineStage = status?.pipelineStage ?? file.pipelineStage

  const isUploading = file.id < 0 && file.pipelineStage === 'ingesting' && uploadProgress !== undefined
  const isSuccess = pipelineStage === 'completed'
  const isError = pipelineStage === 'error'

  const fileStage = isUploading ? 'uploading' : isSuccess ? 'completed' : isError ? 'error' : status?.message ? 'ingesting' : 'queued'

  const accentColor = isSuccess ? 'success' : isError ? 'error' : 'info'
  const error = status?.error ?? file.error
  const message = isSuccess ? 'Completed' : isError ? 'Error' : isUploading ? 'Uploading' : (status?.message ?? 'Queued')
  const progress = isSuccess ? 100 : isUploading ? uploadProgress : (status?.progress ?? 0)

  const progressIcon = ProgressIcon[fileStage]

  return (
    <Paper sx={{ p: 2, pl: 4, marginBottom: 2, borderRadius: '30px' }} elevation={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <Box sx={{ flex: 3 }}>
          <Box display="flex" width="100%" alignItems="center">
            <Link to={`?index=${index}&file=${file.id}`} component={RouterLink}>
              <Typography variant="subtitle1">{file.filename}</Typography>
            </Link>
            <Typography variant="body2" color="text.secondary" sx={{ marginLeft: 'auto' }}>
              {t('common:added')} {new Date(file.createdAt).toLocaleString(locales[i18n.language].code)}
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('common:fileType')}</TableCell>
                <TableCell>{t('rag:fileSize')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{file.fileType}</TableCell>
                <TableCell>{(file.fileSize / 1024).toFixed()} kB</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ ml: '2rem', flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box display="flex" alignItems="center" gap={1} color={`${accentColor}.main`}>
            {progressIcon}
            <div>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {message}
              </Typography>
              {status?.eta && (
                <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
                  {formatDistanceStrict(0, status?.eta)} left
                </Typography>
              )}
              {error?.length && (
                <Typography variant="body2" color="error">
                  {t('error:errorMessage')}: {status?.error ?? file.error}
                </Typography>
              )}
            </div>
          </Box>
        </Box>
        <CircularProgressWithLabel progress={progress} accentColor={accentColor} />
      </Box>
    </Paper>
  )
}
