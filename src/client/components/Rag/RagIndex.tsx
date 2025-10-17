import React from 'react'
import { Button, Box, Typography, styled, LinearProgress, Container, DialogTitle, DialogContent, Dialog, Link, CircularProgress } from '@mui/material'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import Autorenew from '@mui/icons-material/Autorenew'
import CloudUpload from '@mui/icons-material/CloudUpload'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import FindInPage from '@mui/icons-material/FindInPage'
import { orderBy } from 'lodash'
import { RagFileInfo } from './RagFileDetails'
import { RagIndexDetails, useDeleteRagIndexMutation, useRagIndexDetails, useRagIndexJobs, useUploadMutation } from './api'
import { Search } from './Search'
import { useTranslation } from 'react-i18next'
import { BlueButton, OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { enqueueSnackbar } from 'notistack'
import useCurrentUser from '../../hooks/useCurrentUser'
import queryClient from '../../util/queryClient'
import { IngestionPipelineStageKey } from '@shared/ingestion'
import { RagFilesStatus } from './RagFilesStatus'

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

export const RagIndex: React.FC = () => {
  const { user } = useCurrentUser()
  const { t } = useTranslation()
  const { id: strId } = useParams() as { id: string }
  const navigate = useNavigate()
  const id = parseInt(strId, 10)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const [refetchInterval, setRefetchInterval] = React.useState(60 * 1000)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const { data: ragDetails, isSuccess, refetch } = useRagIndexDetails(id)
  const { data: ragFileStatuses, refetch: refetchStatuses } = useRagIndexJobs(id, refetchInterval)
  const uploadMutation = useUploadMutation({ index: ragDetails, onUploadProgress: setUploadProgress })

  const isComplete = ragFileStatuses ? ragFileStatuses.every(({ pipelineStage }) => pipelineStage !== 'ingesting') && !uploadMutation.isPending : false
  const hasErrors = ragFileStatuses ? ragFileStatuses.some(({ pipelineStage }) => pipelineStage === 'error') : false

  React.useEffect(() => {
    if (isComplete) {
      setRefetchInterval(60 * 1000)
    } else {
      setRefetchInterval(1 * 1000)
    }
  }, [isComplete])

  if (!isSuccess) {
    return <LinearProgress />
  }

  const handleUpload = async (files: File[]) => {
    setUploadProgress(0)
    queryClient.setQueryData<RagIndexDetails>(['ragIndex', id], (old) => {
      if (!old) return old
      return {
        ...old,
        ragFiles: [
          ...old.ragFiles,
          ...files.map((f) => ({
            id: Math.random() * -1000, // Temporary ID
            ragIndexId: id,
            filename: f.name,
            fileType: f.type,
            fileSize: f.size,
            createdAt: new Date().toString(),
            updatedAt: new Date().toString(),
            pipelineStage: 'ingesting' as IngestionPipelineStageKey,
            progress: 0,
            numChunks: null,
            userId: user?.id || '',
            metadata: null,
            error: null,
            message: '',
          })),
        ],
      }
    })
    await uploadMutation.mutateAsync(Array.from(files))
    refetch()
    refetchStatuses()
  }

  const coursePagePath = ragDetails?.chatInstances?.[0] ? `/courses/${ragDetails.chatInstances[0].courseId}/rag` : '/rag'

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <OutlineButtonBlack sx={{ mb: 2 }}>
        <Link to={coursePagePath} component={RouterLink} sx={{ display: 'flex' }}>
          <ArrowBackOutlined />
          {t('rag:backToCourse')}
        </Link>
      </OutlineButtonBlack>
      <Typography variant="body1">{t('rag:collection')}</Typography>
      <Typography variant="h3">{ragDetails?.metadata?.name}</Typography>

      <Box py={2}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* @ts-expect-error component somehow not valid prop but it works */}
          <BlueButton component="label" variant="contained" tabIndex={-1} startIcon={<CloudUpload />} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('rag:uploading') : t('rag:uploadFiles')}
            <VisuallyHiddenInput
              type="file"
              onChange={async (e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  await handleUpload(Array.from(files))
                }
              }}
              multiple
            />
          </BlueButton>
          <OutlineButtonBlack startIcon={<FindInPage />} onClick={() => setSearchOpen(true)} disabled={ragDetails.ragFiles.length === 0}>
            {t('rag:testRetrievalButton')}
          </OutlineButtonBlack>
          <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="md">
            <DialogTitle>{t('rag:testRetrieval', { name: ragDetails.metadata.name })}</DialogTitle>
            <DialogContent>
              <Search ragIndex={ragDetails} />
            </DialogContent>
          </Dialog>
          <Button
            startIcon={deleteIndexMutation.isPending ? <CircularProgress /> : <DeleteOutline />}
            disabled={deleteIndexMutation.isPending}
            variant="text"
            color="error"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete index ${ragDetails.metadata?.name}?`)) {
                await deleteIndexMutation.mutateAsync(id)
                const chatInstance = ragDetails.chatInstances?.[0]
                if (chatInstance) {
                  navigate(`/courses/${chatInstance.courseId}/rag`)
                }
                enqueueSnackbar(t('rag:collectionDeleted'), { variant: 'success' })
              }
            }}
            sx={{ mr: 'auto' }}
          >
            {t('rag:deleteCollection')}
          </Button>
          <RagFilesStatus ragFileStatuses={ragFileStatuses ?? []} ragFiles={ragDetails?.ragFiles ?? []} />
        </Box>
        <Box mt={4}>
          <Box display="flex" alignItems="center" mb={2} gap={2}>
            {isComplete && hasErrors && (
              <OutlineButtonBlack
                startIcon={<Autorenew />}
                onClick={async () => {
                  await handleUpload([])
                }}
              >
                {t('rag:retryFailedFiles')}
              </OutlineButtonBlack>
            )}
            {user?.isAdmin && (
              <OutlineButtonBlack
                startIcon={<Autorenew />}
                onClick={async () => {
                  await handleUpload([])
                }}
              >
                Force retry (admin only)
              </OutlineButtonBlack>
            )}
          </Box>
          {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileInfo
              key={file.id}
              file={file}
              status={ragFileStatuses?.find((rfs) => rfs.ragFileId === file.id)}
              link
              uploadProgress={uploadMutation.isPending ? uploadProgress : undefined}
            />
          ))}
        </Box>
      </Box>
    </Container>
  )
}
