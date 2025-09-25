import { useQuery } from '@tanstack/react-query'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import type { RagFileAttributes } from '../../../shared/types'
import { Box, Button, Container, Link, Typography } from '@mui/material'
import { RagFileInfo } from './RagFileDetails'
import type { RagIndexAttributes } from '../../../server/db/models/ragIndex'
import { useDeleteRagFileMutation, useDeleteRagFileTextMutation } from './api'
import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import { enqueueSnackbar } from 'notistack'
import { OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { Autorenew } from '@mui/icons-material'

type RagFile = RagFileAttributes & {
  fileContent: string
  ragIndex: RagIndexAttributes
}

export const RagFile: React.FC = () => {
  const { t } = useTranslation()
  const { id, fileId } = useParams()
  const {
    data: ragFile,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: ['ragFile', id],
    queryFn: async () => {
      const res = await apiClient.get<RagFile>(`/rag/indices/${id}/files/${fileId}`)
      return res.data
    },
  })
  const deleteMutation = useDeleteRagFileMutation()
  const deleteTextMutation = useDeleteRagFileTextMutation()
  const navigate = useNavigate()

  if (isError) {
    return <div>Error: {error.message}</div>
  }

  if (!isSuccess) {
    return <div>Loading...</div>
  }

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Link component={RouterLink} to={`/rag/${id}`}>
        {t('rag:backToCollection')}
      </Link>
      <Typography variant="body1">{t('rag:file')}</Typography>
      <Typography variant="h3">
        {ragFile.ragIndex.metadata?.name} / {ragFile.filename}
      </Typography>
      <Box sx={{ my: 2, display: 'flex', gap: 2 }}>
        {ragFile.fileType === 'application/pdf' && (
          <OutlineButtonBlack
            startIcon={<Autorenew />}
            onClick={async () => {
              await deleteTextMutation.mutateAsync({
                indexId: ragFile.ragIndex.id,
                fileId: ragFile.id,
              })
              enqueueSnackbar(t('rag:fileTextDeleted'), { variant: 'success' })

              navigate(`/rag/${ragFile.ragIndex.id}`)
            }}
            sx={{ my: 2 }}
          >
            {t('rag:deleteFileText')}
          </OutlineButtonBlack>
        )}
        <Button
          variant="text"
          color="error"
          onClick={async () => {
            if (window.confirm('Are you sure you want to delete this file?')) {
              await deleteMutation.mutateAsync({
                indexId: ragFile.ragIndex.id,
                fileId: ragFile.id,
              })
              enqueueSnackbar(t('rag:fileDeleted'), { variant: 'success' })

              navigate(`/rag/${ragFile.ragIndex.id}`)
            }
          }}
        >
          {t('rag:deleteFile')}
        </Button>
      </Box>
      <RagFileInfo file={ragFile} />
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
    </Container>
  )
}
