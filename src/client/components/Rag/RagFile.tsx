import { useQuery } from '@tanstack/react-query'
import { useParams, Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../../util/apiClient'
import type { RagFileAttributes } from '../../../shared/types'
import { Box, Breadcrumbs, Button, Container, Link, Typography } from '@mui/material'
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

export const RagFile: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileId = Number(searchParams.get('file'))
  const indexId = Number(searchParams.get('index'))
  const params = useParams<{ courseId: string }>()


  const {
    data: ragFile,
    isSuccess,
    isError,
    error,
  } = useQuery({
    queryKey: ['ragFile', indexId],
    queryFn: async () => {
      const res = await apiClient.get<RagFile>(`/rag/indices/${indexId}/files/${fileId}`)
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
    <Container>
      <Breadcrumbs>
        <Link href={`/${params.courseId}/course/rag?index=${ragFile.ragIndexId}`} >{ragFile.ragIndex.metadata?.name}</Link> /
        <Typography>{ragFile.filename}
        </Typography>
      </Breadcrumbs>
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

              navigate(`/${params.courseId}/course/rag/${ragFile.ragIndex.id}`)
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

              navigate(`/${params.courseId}/courses/rag/${ragFile.ragIndex.id}`)
            }
          }}
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
    </Container>
  )
}
