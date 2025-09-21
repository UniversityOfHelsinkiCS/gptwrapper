import React from 'react'
import { Button, Box, Typography, styled, LinearProgress, Container, DialogTitle, DialogContent, Dialog, Link, CircularProgress } from '@mui/material'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import { ArrowBackOutlined, CloudUpload, DeleteOutline, FindInPage } from '@mui/icons-material'
import { orderBy } from 'lodash'
import { RagFileInfo } from './RagFileDetails'
import { useDeleteRagIndexMutation, useRagIndexDetails, useUploadMutation } from './api'
import { Search } from './Search'
import { useTranslation } from 'react-i18next'
import { BlueButton, OutlineButtonBlack } from '../ChatV2/general/Buttons'

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
  const { t } = useTranslation()
  const { id: strId } = useParams() as { id: string }
  const navigate = useNavigate()
  const id = parseInt(strId, 10)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const [refetchInterval, setRefetchInterval] = React.useState(60 * 1000)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const { data: ragDetails, isSuccess, refetch } = useRagIndexDetails(id, refetchInterval)
  const uploadMutation = useUploadMutation({ index: ragDetails, onUploadProgress: setUploadProgress })

  const isComplete = ragDetails
    ? ragDetails.ragFiles.every((file) => file.pipelineStage === 'completed' || file.pipelineStage === 'error') && !uploadMutation.isPending
    : false
  const hasErrors = ragDetails ? ragDetails.ragFiles.some((file) => file.pipelineStage === 'error') : false

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
    await uploadMutation.mutateAsync(Array.from(files))
    refetch()
  }

  const coursePagePath = ragDetails?.chatInstances?.[0] ? `/courses/${ragDetails.chatInstances[0].id}/rag` : '/rag'

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Link to={coursePagePath} component={RouterLink}>
        <ArrowBackOutlined />
        {t('rag:backToCourse')}
      </Link>
      <Typography variant="body1">{t('rag:collection')}</Typography>
      <Typography variant="h3">{ragDetails?.metadata?.name}</Typography>
      <Box py={2}>
        <Box sx={{ display: 'flex', gap: 2 }}>
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
                  navigate(`/courses/${chatInstance.id}/rag`)
                }
              }
            }}
          >
            {t('rag:deleteCollection')}
          </Button>
        </Box>
        <Box mt={4}>
          <Typography variant="h6">{t('rag:files')}</Typography>
          <Box display="flex" alignItems="center" my={1}>
            {isComplete && !hasErrors && ragDetails.ragFiles.length > 0 && (
              <Typography variant="body2" color="success.main">
                {t('rag:allFilesProcessedSuccessfully')}
              </Typography>
            )}
            {isComplete && hasErrors && (
              <>
                <Typography variant="body2" color="error">
                  {t('rag:processingFailures')}
                </Typography>
                <OutlineButtonBlack
                  sx={{ ml: 2 }}
                  onClick={async () => {
                    await handleUpload([])
                  }}
                >
                  {t('rag:retryFailedFiles')}
                </OutlineButtonBlack>
              </>
            )}
          </Box>
          {uploadMutation.isPending && <LinearProgress value={uploadProgress} variant="determinate" />}
          {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileInfo key={file.id} file={file} link />
          ))}
        </Box>
      </Box>
    </Container>
  )
}
