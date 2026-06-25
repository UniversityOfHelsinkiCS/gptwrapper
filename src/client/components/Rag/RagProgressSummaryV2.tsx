import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'
import { IngestionJobStatus } from '@shared/ingestion'
import { RagFileAttributes } from '@shared/types'
import { useTranslation } from 'react-i18next'

export const RagProgressSummaryV2: React.FC<{ ragFiles: RagFileAttributes[]; ragFileStatuses: IngestionJobStatus[] }> = ({ ragFiles, ragFileStatuses }) => {
  const { t } = useTranslation()

  const filesWithStatus = ragFiles.map((file) => ({ file, status: ragFileStatuses.find((s) => s.ragFileId === file.id) }))
  const completedCount = filesWithStatus.filter(({ status }) => status?.pipelineStage === 'completed').length
  const errorCount = filesWithStatus.filter(({ status }) => !!status?.error || status?.pipelineStage === 'error').length
  const totalCount = ragFiles.length

  if (totalCount === 0) return null

  const allCompleted = completedCount === totalCount
  const color = allCompleted ? 'success' : errorCount > 0 ? 'error' : 'info'

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5 }}>
      <LinearProgress
        variant="determinate"
        value={(completedCount / totalCount) * 100}
        color={color}
        sx={{ flex: 1, height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {t('rag:processedProgress', { done: completedCount, total: totalCount })}
      </Typography>
    </Box>
  )
}
