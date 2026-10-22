import React, { useRef } from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'
import { IngestionJobStatus } from '@shared/ingestion'
import { RagFileAttributes } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { StatusAnnouncer } from '../common/accessibility/StatusAnnouncer'

export const RagProgressSummaryV2: React.FC<{ ragFiles: RagFileAttributes[]; ragFileStatuses: IngestionJobStatus[] }> = ({ ragFiles, ragFileStatuses }) => {
  const { t } = useTranslation()
  const hasSeenProcessingRef = useRef(false)

  const filesWithStatus = ragFiles.map((file) => ({ file, status: ragFileStatuses.find((s) => s.ragFileId === file.id) }))
  const completedCount = filesWithStatus.filter(({ status }) => status?.pipelineStage === 'completed').length
  const errorCount = filesWithStatus.filter(({ status }) => !!status?.error || status?.pipelineStage === 'error').length
  const isProcessing = filesWithStatus.some(({ file, status }) => file.id <= 0 || status?.pipelineStage === 'ingesting')
  const totalCount = ragFiles.length

  if (isProcessing) hasSeenProcessingRef.current = true

  const allCompleted = completedCount === totalCount
  const color = allCompleted ? 'success' : errorCount > 0 ? 'error' : 'info'
  const progressText = t('rag:processedProgress', { done: completedCount, total: totalCount })

  const getStatusMessage = () => {
    if (!hasSeenProcessingRef.current || totalCount === 0) return ''
    if (allCompleted) return t('rag:allFilesProcessedSuccessfully')
    return errorCount > 0 ? `${progressText}. ${t('rag:processingFailures')}` : progressText
  }

  return (
    <>
      <StatusAnnouncer message={getStatusMessage()} />
      {totalCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={(completedCount / totalCount) * 100}
            aria-label={progressText}
            color={color}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {progressText}
          </Typography>
        </Box>
      )}
    </>
  )
}
