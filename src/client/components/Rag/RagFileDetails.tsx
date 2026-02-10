import { Box, Link, styled, TableCell, TableHead, TableRow, Typography } from '@mui/material'
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

const HideOnSmall = styled(TableCell)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}))

const HideOnSmallHead = styled(TableCell)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
})) as typeof TableCell

export const RagFileTableHead: React.FC = () => {
  const { t } = useTranslation()
  return (
    <TableHead>
      <TableRow>
        <TableCell><strong>{t('rag:fileName')}</strong></TableCell>
        <HideOnSmallHead><strong>{t('common:fileType')}</strong></HideOnSmallHead>
        <TableCell><strong>{t('rag:fileSizeKb')}</strong></TableCell>
        <TableCell><strong>{t('rag:parsing')}</strong></TableCell>
        <HideOnSmallHead><strong>{t('common:added')}</strong></HideOnSmallHead>
        <TableCell><strong>{t('rag:fileStatus')}</strong></TableCell>
        <TableCell />
      </TableRow>
    </TableHead>
  )
}

export const RagFileInfo: React.FC<{
  file: RagFileAttributes
  index: number
  status?: IngestionJobStatus
  uploadProgress?: number
}> = ({ file, index, status, uploadProgress }) => {
  const { t, i18n } = useTranslation()
  const usedAdvancedParsing = !!(file.metadata as Record<string, unknown> | null)?.advancedParsing
  const isPdf = file.fileType === 'application/pdf'

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
    <TableRow>
      <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
        <Link to={`?index=${index}&file=${file.id}`} component={RouterLink}>
          {file.filename}
        </Link>
      </TableCell>
      <HideOnSmall>{file.fileType}</HideOnSmall>
      <TableCell>{(file.fileSize / 1024).toFixed()} kB</TableCell>
      <TableCell>
        {isPdf && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2">
              {usedAdvancedParsing ? t('rag:advancedParsing') : t('rag:standardParsing')}
            </Typography>
          </Box>
        )}
      </TableCell>
      <HideOnSmall>
        <Typography variant="body2" color="text.secondary">
          {new Date(file.createdAt).toLocaleString(locales[i18n.language].code)}
        </Typography>
      </HideOnSmall>
      <TableCell>
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
      </TableCell>
      <TableCell>
        <CircularProgressWithLabel progress={progress} accentColor={accentColor} />
      </TableCell>
    </TableRow>
  )
}
