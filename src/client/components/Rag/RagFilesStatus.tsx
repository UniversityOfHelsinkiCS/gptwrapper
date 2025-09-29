import { Box, CircularProgress, Typography } from '@mui/material'
import { IngestionJobStatus } from '@shared/ingestion'
import { RagFileAttributes } from '@shared/types'
import { CircularProgressWithLabel } from '../common/CircularProgressWithLabel'
import { useTranslation } from 'react-i18next'

export const RagFilesStatus = ({ ragFiles, ragFileStatuses }: { ragFiles: RagFileAttributes[]; ragFileStatuses: IngestionJobStatus[] }) => {
  const { t } = useTranslation()
  const filesWithStatus = ragFiles.map((file) => {
    const status = ragFileStatuses.find((s) => s.ragFileId === file.id)
    return { file, status }
  })

  const completedCount = filesWithStatus.filter(({ status }) => status?.pipelineStage === 'completed').length
  const uploadingCount = filesWithStatus.filter(({ file }) => file.id <= 0).length
  const ingestingCount = filesWithStatus.filter(({ status }) => status?.pipelineStage === 'ingesting').length
  const errorCount = filesWithStatus.filter(({ status }) => !!status?.error || status?.pipelineStage === 'error').length
  const totalCount = ragFiles.length
  const allCompleted = completedCount === totalCount && totalCount > 0
  // console.log({ completedCount, uploadingCount, ingestingCount, errorCount, totalCount, allCompleted })
  return (
    <Box display="flex" alignItems="center" gap={2}>
      <Box>
        {uploadingCount ? <Typography>{t('rag:waitForUpload')}</Typography> : null}
        {errorCount ? <Typography color="error">{t('rag:processingFailures', { count: errorCount })}</Typography> : null}
        {ingestingCount && !uploadingCount ? <Typography>{t('rag:filesIngesting', { count: ingestingCount })}</Typography> : null}
        {allCompleted ? <Typography>{t('rag:allCompleted')}</Typography> : null}
      </Box>
      <CircularProgressWithLabel
        size={60}
        progress={(completedCount / totalCount) * 100}
        label={`${completedCount}/${totalCount}`}
        accentColor={allCompleted ? 'success' : errorCount > 0 ? 'error' : 'info'}
      />
    </Box>
  )
}
