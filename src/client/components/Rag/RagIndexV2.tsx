import React from 'react'
import {
  Button,
  Box,
  Typography,
  styled,
  LinearProgress,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog,
  CircularProgress,
  Divider,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import Autorenew from '@mui/icons-material/Autorenew'
import CloudUpload from '@mui/icons-material/CloudUpload'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import FindInPage from '@mui/icons-material/FindInPage'
import FolderOpen from '@mui/icons-material/FolderOpen'
import { orderBy } from 'lodash'
import { RagIndexDetails, useDeleteRagFileMutation, useDeleteRagIndexMutation, useRagIndexDetails, useRagIndexJobs, useUploadMutation } from './api'
import { Search } from './Search'
import { useTranslation } from 'react-i18next'
import { BlueButton, OrangeButton, OutlineButtonBlack, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { enqueueSnackbar } from 'notistack'
import useCurrentUser from '../../hooks/useCurrentUser'
import queryClient from '../../util/queryClient'
import { IngestionPipelineStageKey } from '@shared/ingestion'
import apiClient from '../../util/apiClient'
import { EditableTitle } from './EditableTitle'
import { RagFileRowV2 } from './RagFileRowV2'
import { RagProgressSummaryV2 } from './RagProgressSummaryV2'

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

interface RagIndexV2Props {
  indexId: number
  onBack: () => void
  onSelectFile: (fileId: number) => void
}

export const RagIndexV2: React.FC<RagIndexV2Props> = ({ indexId, onBack, onSelectFile }) => {
  const { user } = useCurrentUser()
  const { t } = useTranslation()

  const [searchOpen, setSearchOpen] = React.useState(false)
  const deleteIndexMutation = useDeleteRagIndexMutation(indexId)
  const deleteFileMutation = useDeleteRagFileMutation()
  const [refetchInterval, setRefetchInterval] = React.useState(60 * 1000)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([])
  const [advancedParsing, setAdvancedParsing] = React.useState<boolean[]>([])
  const { data: ragDetails, isSuccess, refetch } = useRagIndexDetails(indexId)
  const { data: ragFileStatuses, refetch: refetchStatuses } = useRagIndexJobs(indexId, refetchInterval)
  const uploadMutation = useUploadMutation({ index: ragDetails, onUploadProgress: setUploadProgress })

  const isComplete = ragFileStatuses ? ragFileStatuses.every(({ pipelineStage }) => pipelineStage !== 'ingesting') && !uploadMutation.isPending : false

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
    queryClient.setQueryData<RagIndexDetails>(['ragIndex', indexId], (old) => {
      if (!old) return old
      return {
        ...old,
        ragFiles: [
          ...old.ragFiles,
          ...files.map((f) => ({
            id: Math.random() * -1000,
            ragIndexId: indexId,
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
    await apiClient.post(`/rag/indices/${indexId}/reset`)
    refetch()
    refetchStatuses()
  }

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm(t('rag:confirmDeleteFile'))) return
    await deleteFileMutation.mutateAsync({ indexId, fileId })
    enqueueSnackbar(t('rag:fileDeleted'), { variant: 'success' })
    refetch()
    refetchStatuses()
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <FolderOpen sx={{ color: 'secondary.main' }} />
          <EditableTitle ragIndex={ragDetails} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {t('rag:fileCountLabel', { count: ragDetails.ragFiles.length })}
        </Typography>
      </Box>
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
          <OutlineButtonBlue startIcon={<FindInPage />} onClick={() => setSearchOpen(true)} disabled={ragDetails.ragFiles.length === 0}>
            {t('rag:testRetrievalButton')}
          </OutlineButtonBlue>
          <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} fullWidth maxWidth="lg">
            <DialogTitle>{t('rag:testRetrieval', { name: ragDetails.metadata.name })}</DialogTitle>
            <DialogContent>
              <Search ragIndex={ragDetails} />
            </DialogContent>
          </Dialog>
          {user?.isAdmin && (
            <OrangeButton startIcon={<Autorenew />} onClick={handleReset}>
              {t('admin:tryAgain')}
            </OrangeButton>
          )}
          <Button
            startIcon={deleteIndexMutation.isPending ? <CircularProgress /> : <DeleteOutline />}
            disabled={deleteIndexMutation.isPending}
            variant="text"
            color="error"
            data-testid="ragIndexDeleteButton"
            onClick={async () => {
              if (window.confirm(`Are you sure you want to delete index ${ragDetails.metadata?.name}?`)) {
                await deleteIndexMutation.mutateAsync()
                onBack()
                enqueueSnackbar(t('rag:collectionDeleted'), {
                  variant: 'success',
                  /* @ts-expect-error why not allowed lol, even the docstring tells this is how u use SnackbarProps */
                  SnackbarProps: { 'data-testid': 'ragIndexDeleteSuccessSnackbar' },
                })
              }
            }}
            sx={{ ml: 'auto' }}
          >
            {t('rag:deleteCollection')}
          </Button>
        </Box>
        <RagProgressSummaryV2 ragFileStatuses={ragFileStatuses ?? []} ragFiles={ragDetails?.ragFiles ?? []} />
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
            <RagFileRowV2
              key={file.id}
              file={file}
              status={ragFileStatuses?.find((rfs) => rfs.ragFileId === file.id)}
              uploadProgress={uploadMutation.isPending ? uploadProgress : undefined}
              onSelectFile={onSelectFile}
              onDelete={handleDeleteFile}
              onRetry={async () => {
                await handleUpload([], [])
              }}
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
              setStagedFiles([])
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
