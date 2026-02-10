import React from 'react'
import {
  Button,
  Box,
  Typography,
  styled,
  LinearProgress,
  Container,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog,
  Link,
  CircularProgress,
  Breadcrumbs,
  Divider,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useNavigate, useParams, Link as RouterLink, useSearchParams } from 'react-router-dom'
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
import apiClient from '../../util/apiClient'
import { ArrowBack } from '@mui/icons-material'
import useCourse from '../../hooks/useCourse'
import { EditableTitle } from './EditableTitle'

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
  const { courseId } = useParams<{ courseId: string }>()

  const [searchParams, _setSearchParams] = useSearchParams()
  const id = Number(searchParams.get('index'))
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const deleteIndexMutation = useDeleteRagIndexMutation(id)
  const [refetchInterval, setRefetchInterval] = React.useState(60 * 1000)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([])
  const [advancedParsing, setAdvancedParsing] = React.useState<boolean[]>([])
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

  const handleStageFiles = (files: File[]) => {
    setStagedFiles(files)
    setAdvancedParsing(files.map(() => false))
  }

  const handleUpload = async (files: File[], perFileAdvancedParsing: boolean[]) => {
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
    await uploadMutation.mutateAsync({ files: Array.from(files), advancedParsing: perFileAdvancedParsing })
    setStagedFiles([])
    setAdvancedParsing([])
    refetch()
    refetchStatuses()
  }

  const handleReset = async () => {
    await apiClient.post(`/rag/indices/${id}/reset`)
    refetch()
    refetchStatuses()
  }

  return (
    <Box>
      <OutlineButtonBlack sx={{ mb: 2 }} onClick={() => navigate(`/${courseId}/course/rag`)} data-testid="ragIndexBackToList">
        <ArrowBack />
      </OutlineButtonBlack>
      <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
        <Breadcrumbs>
          <EditableTitle ragIndex={ragDetails} />
        </Breadcrumbs>
      </Box>
      <Divider />
      <Box py={2} mx={2}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* @ts-expect-error component somehow not valid prop but it works */}
          <BlueButton component="label" variant="contained" tabIndex={-1} startIcon={<CloudUpload />} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('rag:uploading') : t('rag:uploadFiles')}
            <VisuallyHiddenInput
              type="file"
              onChange={async (e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  handleStageFiles(Array.from(files))
                }
                e.target.value = ''
              }}
              multiple
            />
          </BlueButton>
          <OutlineButtonBlack startIcon={<FindInPage />} onClick={() => setSearchOpen(true)} disabled={ragDetails.ragFiles.length === 0}>
            {t('rag:testRetrievalButton')}
          </OutlineButtonBlack>
          <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="lg">
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
            data-testid="ragIndexDeleteButton"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete index ${ragDetails.metadata?.name}?`)) {
                await deleteIndexMutation.mutateAsync()
                const chatInstance = ragDetails.chatInstances?.[0]
                if (chatInstance) {
                  navigate(`/${courseId}/course/rag`)
                }
                enqueueSnackbar(t('rag:collectionDeleted'), {
                  variant: 'success',
                  /* @ts-expect-error why not allowed lol, even the docstring tells this is how u use SnackbarProps */
                  SnackbarProps: { 'data-testid': 'ragIndexDeleteSuccessSnackbar' },
                })
              }
            }}
            sx={{ mr: 'auto' }}
          >
            {t('rag:deleteCollection')}
          </Button>
          {user?.isAdmin && (
            <OutlineButtonBlack startIcon={<Autorenew />} onClick={handleReset}>
              Reset (admin only)
            </OutlineButtonBlack>
          )}
          <RagFilesStatus ragFileStatuses={ragFileStatuses ?? []} ragFiles={ragDetails?.ragFiles ?? []} />
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box>
          <Box display="flex" alignItems="center" mb={2} gap={2}>
            {isComplete && hasErrors && (
              <OutlineButtonBlack
                startIcon={<Autorenew />}
                onClick={async () => {
                  await handleUpload([], [])
                }}
              >
                {t('rag:retryFailedFiles')}
              </OutlineButtonBlack>
            )}
          </Box>
          {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileInfo
              key={file.id}
              file={file}
              index={id}
              status={ragFileStatuses?.find((rfs) => rfs.ragFileId === file.id)}
              uploadProgress={uploadMutation.isPending ? uploadProgress : undefined}
            />
          ))}
        </Box>
      </Box>
      <Dialog open={stagedFiles.length > 0} onClose={() => setStagedFiles([])} fullWidth maxWidth="sm">
        <DialogTitle>{t('rag:uploadFiles')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={1}>
            {t('rag:advancedParsingGuide')}
          </Typography>
          <List dense>
            {stagedFiles.map((file, idx) => (
              <ListItem key={file.name} disableGutters>
                <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(0)} KB`} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={advancedParsing[idx] ?? false}
                      onChange={(e) => {
                        setAdvancedParsing((prev) => {
                          const next = [...prev]
                          next[idx] = e.target.checked
                          return next
                        })
                      }}
                    />
                  }
                  label={t('rag:advancedParsing')}
                  labelPlacement="start"
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <OutlineButtonBlack onClick={() => setStagedFiles([])}>{t('common:cancel')}</OutlineButtonBlack>
          <BlueButton
            variant="contained"
            onClick={async () => {
              await handleUpload(stagedFiles, advancedParsing)
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? t('rag:uploading') : t('rag:uploadFiles')}
          </BlueButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
