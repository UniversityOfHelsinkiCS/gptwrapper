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
import Autorenew from '@mui/icons-material/Autorenew'

type RagFile = RagFileAttributes & {
  fileContent: string
  ragIndex: RagIndexAttributes
}

export const RagFile = ({ ragIndexId, fileId, setFileId }: { ragIndexId?: number, fileId?: number, setFileId?: React.Dispatch<number | undefined> }) => {
  const { t } = useTranslation()
  const params = useParams<{ id: string; fileId: string }>()

  // Use props if provided, otherwise fall back to URL params
  const indexId = ragIndexId ?? (params.id ? parseInt(params.id, 10) : undefined)
  const finalFileId = fileId ?? (params.fileId ? parseInt(params.fileId, 10) : undefined)

  const {
    data: ragFile,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: ['ragFile', indexId],
    queryFn: async () => {
      const res = await apiClient.get<RagFile>(`/rag/indices/${indexId}/files/${finalFileId}`)
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
      {!ragIndexId ? <Link component={RouterLink} to={`/rag/${indexId}`}>
        {t('rag:backToCollection')}
      </Link> : <OutlineButtonBlack onClick={() => setFileId(undefined)} />}

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
      <RagFileInfo file={ragFile} setFileId={() => null} />
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
