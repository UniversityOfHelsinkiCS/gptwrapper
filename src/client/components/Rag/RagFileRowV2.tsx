import React from 'react'
import { Box, IconButton, LinearProgress, Link, Tooltip, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import Autorenew from '@mui/icons-material/Autorenew'
import CheckCircle from '@mui/icons-material/CheckCircle'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import ErrorOutline from '@mui/icons-material/ErrorOutline'
import { IngestionJobStatus } from '@shared/ingestion'
import type { RagFileAttributes } from '@shared/types'
import { useTranslation } from 'react-i18next'
import { OutlineButtonBlue } from '../ChatV2/general/Buttons'

type BadgePalette = 'error' | 'warning' | 'primary' | 'secondary'

const badgeFor = (file: RagFileAttributes): { label: string; palette: BadgePalette } => {
  const ext = file.filename.includes('.') ? file.filename.split('.').pop()!.toUpperCase() : file.fileType.split('/').pop()!.toUpperCase()
  if (ext === 'PDF') return { label: 'PDF', palette: 'error' }
  if (ext === 'PPTX' || ext === 'PPT') return { label: ext, palette: 'warning' }
  if (ext === 'PNG' || ext === 'JPG' || ext === 'JPEG') return { label: ext, palette: 'secondary' }
  return { label: ext.slice(0, 4), palette: 'primary' }
}

interface RagFileRowV2Props {
  file: RagFileAttributes
  status?: IngestionJobStatus
  uploadProgress?: number
  onSelectFile: (fileId: number) => void
  onDelete: (fileId: number) => void
  onRetry: () => void
}

export const RagFileRowV2: React.FC<RagFileRowV2Props> = ({ file, status, uploadProgress, onSelectFile, onDelete, onRetry }) => {
  const { t } = useTranslation()

  const pipelineStage = status?.pipelineStage ?? file.pipelineStage
  const isUploading = file.id < 0 && file.pipelineStage === 'ingesting' && uploadProgress !== undefined
  const isSuccess = pipelineStage === 'completed'
  const isError = pipelineStage === 'error'
  const error = status?.error ?? file.error
  const progress = isSuccess ? 100 : isUploading ? uploadProgress ?? 0 : status?.progress ?? 0

  const badge = badgeFor(file)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        p: 1.5,
        borderRadius: 2,
        backgroundColor: isError ? (theme) => alpha(theme.palette.error.main, 0.05) : 'transparent',
        '&:hover': { backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05) },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: badge.label.length > 3 ? '0.6rem' : '0.65rem',
          backgroundColor: (theme) => alpha(theme.palette[badge.palette].main, 0.13),
          color: (theme) => theme.palette[badge.palette].main,
        }}
      >
        {badge.label}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Link
          component="button"
          onClick={() => onSelectFile(file.id)}
          sx={{ display: 'block', textAlign: 'left', maxWidth: '100%', fontWeight: 500, color: 'text.primary', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
        >
          {file.filename}
        </Link>

        {isSuccess && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'success.main' }}>
            <CheckCircle sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {t('rag:statusReady')}
            </Typography>
          </Box>
        )}

        {!isSuccess && !isError && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
            <LinearProgress variant="determinate" value={progress} color="info" sx={{ flex: 1, maxWidth: 200, height: 5, borderRadius: 3 }} />
            <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {t('rag:statusProcessing')} · {Math.round(progress)} %
            </Typography>
          </Box>
        )}

        {isError && (
          <Box sx={{ mt: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main' }}>
              <ErrorOutline sx={{ fontSize: 16 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('rag:statusFailed')}
              </Typography>
            </Box>
            {error && (
              <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                {t('error:errorMessage')}: {error}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {isError && (
        <OutlineButtonBlue startIcon={<Autorenew />} onClick={onRetry} sx={{ flexShrink: 0 }}>
          {t('rag:retryFailedFiles')}
        </OutlineButtonBlue>
      )}

      <Tooltip title={t('rag:deleteFile')}>
        <IconButton
          onClick={() => onDelete(file.id)}
          sx={{ flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'error.main', backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1) } }}
        >
          <DeleteOutline />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
