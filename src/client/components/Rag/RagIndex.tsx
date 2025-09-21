import React from 'react'
import { Button, Box, Typography, styled, LinearProgress, Container } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { CloudUpload } from '@mui/icons-material'
import { orderBy } from 'lodash'
import { RagFileInfo } from './RagFileDetails'
import { useDeleteRagIndexMutation, useRagIndexDetails, useUploadMutation } from './api'
import { Search } from './Search'
import { useTranslation } from 'react-i18next'
import { BlueButton, OutlineButtonBlack, OutlineButtonBlue } from '../ChatV2/general/Buttons'

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
  const deleteIndexMutation = useDeleteRagIndexMutation()
  const { data: ragDetails, isSuccess, refetch } = useRagIndexDetails(id)
  const uploadMutation = useUploadMutation(ragDetails)

  if (!isSuccess) {
    return <LinearProgress />
  }

  const isComplete = ragDetails.ragFiles.every((file) => file.pipelineStage === 'completed' || file.pipelineStage === 'error')
  const hasErrors = ragDetails.ragFiles.some((file) => file.pipelineStage === 'error')

  return (
    <Container sx={{ mt: '4rem', mb: '10rem' }} maxWidth="xl">
      <Typography variant="body1">{t('rag:collection')}</Typography>
      <Typography variant="h3">{ragDetails?.metadata?.name}</Typography>
      <Box py={2}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* @ts-expect-error component somehow not valid prop but it works */}
          <BlueButton component="label" variant="contained" tabIndex={-1} startIcon={<CloudUpload />} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('rag:uploading') : t('rag:uploadFiles')}
            <VisuallyHiddenInput
              type="file"
              onChange={async (event) => {
                const files = event.target.files
                if (files && files.length > 0) {
                  await uploadMutation.mutateAsync(Array.from(files))
                  refetch()
                }
              }}
              multiple
            />
          </BlueButton>
          <Button
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
        <Search ragIndex={ragDetails} />
        <Box mt={2}>
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
                    await uploadMutation.mutateAsync([])
                  }}
                >
                  {t('rag:retryFailedFiles')}
                </OutlineButtonBlack>
              </>
            )}
          </Box>
          {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileInfo key={file.id} file={file} link />
          ))}
        </Box>
      </Box>
    </Container>
  )
}
