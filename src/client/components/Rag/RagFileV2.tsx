import { useQuery } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import type { RagFileAttributes } from '../../../shared/types'
import type { RagIndexAttributes } from '../../../server/db/models/ragIndex'
import { Box, Button, Typography } from '@mui/material'
import { useDeleteRagFileMutation } from './api'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { enqueueSnackbar } from 'notistack'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { ArrowBack } from '@mui/icons-material'

type RagFile = RagFileAttributes & {
  fileContent: string
  ragIndex: RagIndexAttributes
}

interface RagFileV2Props {
  indexId: number
  fileId: number
  onBack: () => void
}

export const RagFileV2: React.FC<RagFileV2Props> = ({ indexId, fileId, onBack }) => {
  const { t } = useTranslation()

  const { data: ragFile, isSuccess, isError, error } = useQuery({
    queryKey: ['ragFile', indexId, fileId],
    queryFn: async () => {
      const res = await apiClient.get<RagFile>(`/rag/indices/${indexId}/files/${fileId}`)
      return res.data
    },
  })
  const deleteMutation = useDeleteRagFileMutation()

  if (isError) {
    return <div>{t('rag:errorWithMessage', { message: (error as Error).message })}</div>
  }

  if (!isSuccess) {
    return <div>Loading...</div>
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <OutlineButtonBlack onClick={onBack}>
        <ArrowBack />
      </OutlineButtonBlack>
      <Box sx={{ my: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this file?')) {
              await deleteMutation.mutateAsync({ indexId, fileId })
              enqueueSnackbar(t('rag:fileDeleted'), { variant: 'success' })
              onBack()
            }
          }}
          sx={{ my: 2, borderRadius: '1.25rem' }}
        >
          {t('rag:deleteFile')}
        </Button>
      </Box>
      <Typography variant="h4">{t('rag:content')}</Typography>
      {ragFile.fileContent.length === 0 ? (
        <Typography variant="body1">{t('rag:noContent')}</Typography>
      ) : ragFile.fileType === 'application/pdf' || ragFile.fileType === 'text/markdown' ? (
        <Markdown>{ragFile.fileContent}</Markdown>
      ) : (
        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
          {ragFile.fileContent}
        </Typography>
      )}
    </Box>
  )
}
