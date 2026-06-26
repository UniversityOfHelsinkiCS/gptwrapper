import React from 'react'
import {
  Alert,
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
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import Autorenew from '@mui/icons-material/Autorenew'
import CloudUpload from '@mui/icons-material/CloudUpload'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import FindInPage from '@mui/icons-material/FindInPage'
import Bookmarks from '@mui/icons-material/Bookmarks'
import HourglassEmpty from '@mui/icons-material/HourglassEmpty'
import { orderBy } from 'lodash'
import { RagIndexDetails, useDeleteRagFileMutation, useDeleteRagIndexMutation, useRagIndexDetails, useRagIndexJobs, useUploadMutation } from './api'
import { Search } from './Search'
import { useTranslation } from 'react-i18next'
import { BlueButton, OrangeButton, OutlineButtonBlack } from '../ChatV2/general/Buttons'
import { enqueueSnackbar } from 'notistack'
import useCurrentUser from '../../hooks/useCurrentUser'
import queryClient from '../../util/queryClient'
import { IngestionPipelineStageKey } from '@shared/ingestion'
import apiClient from '../../util/apiClient'
import { EditableTitle } from './EditableTitle'
import { RagFileRowV2 } from './RagFileRowV2'
import { RagProgressSummaryV2 } from './RagProgressSummaryV2'
import { isSupportedRagFile, RAG_FILE_ACCEPT } from '@shared/utils'

const isImageFile = (fileType: string) => fileType === 'image/png'

// Only PDFs benefit from a choice between standard and AI-based parsing. Images always require AI
// parsing and text files never need it, so the toggle is shown for PDFs only.
const isPdfFile = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const fileExtension = (name: string) => {
  const dot = name.lastIndexOf('.')
  return (dot > -1 ? name.slice(dot + 1) : 'file').toUpperCase().slice(0, 4)
}

// Truncate in the middle so the file extension stays visible.
const truncateMiddle = (name: string, max: number) => {
  if (name.length <= max) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot) : ''
  const base = dot > -1 ? name.slice(0, dot) : name
  const keep = Math.max(8, max - ext.length - 1)
  const head = Math.ceil(keep * 0.6)
  const tail = Math.floor(keep * 0.4)
  return `${base.slice(0, head)}…${base.slice(base.length - tail)}${ext}`
}

const fileSizeLabel = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`

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
    const supported = files.filter((f) => isSupportedRagFile(f.name, f.type))
    const unsupported = files.filter((f) => !isSupportedRagFile(f.name, f.type))

    if (unsupported.length > 0) {
      enqueueSnackbar(t('rag:unsupportedFileType', { files: unsupported.map((f) => f.name).join(', ') }), { variant: 'error' })
    }
    if (supported.length === 0) return

    setStagedFiles(supported)
    // Images can only be read via AI-based (VLM) parsing, so force it on for them.
    setAdvancedParsing(supported.map((f) => isImageFile(f.type)))
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
          <Bookmarks sx={{ color: 'secondary.main' }} />
          <EditableTitle ragIndex={ragDetails} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {t('rag:fileCountLabel', { count: ragDetails.ragFiles.length })}
        </Typography>
      </Box>
      <Box py={2} mx={2}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* @ts-expect-error component somehow not valid prop but it works */}
          <Button variant="contained" component="label" variant="contained" tabIndex={-1} startIcon={<CloudUpload />} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('rag:uploading') : t('rag:uploadFiles')}
            <VisuallyHiddenInput
              type="file"
              accept={RAG_FILE_ACCEPT}
              onChange={async (e) => {
                const files = e.target.files
                if (files && files.length > 0) {
                  handleStageFiles(Array.from(files))
                }
                e.target.value = ''
              }}
              multiple
            />
          </Button>
          <Button variant="outlined" startIcon={<FindInPage />} onClick={() => setSearchOpen(true)} disabled={ragDetails.ragFiles.length === 0}>
            {t('rag:testRetrievalButton')}
          </Button>
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
          <Collapse in={advancedParsing.some(Boolean)} timeout={220} unmountOnExit>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
              <Alert severity="info">{t('rag:advancedParsingInfo')}</Alert>
              <Alert severity="warning" icon={<HourglassEmpty fontSize="small" />}>
                {t('rag:advancedParsingTimeWarning')}
              </Alert>
              <Alert severity="warning">{t('rag:advancedParsingAccuracyWarning')}</Alert>
            </Box>
          </Collapse>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1,
                backgroundColor: 'background.subtle',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em', color: 'text.secondary' }}>
                {t('rag:fileName')}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em', color: 'text.secondary' }}>
                {t('rag:parsing')}
              </Typography>
            </Box>
            {stagedFiles.map((file, idx) => {
              const isImage = isImageFile(file.type)
              const isPdf = isPdfFile(file)
              const mode = isImage || (advancedParsing[idx] ?? false) ? 'advanced' : 'standard'
              return (
                <Box
                  key={file.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    ...(idx > 0 && { borderTop: '1px solid', borderColor: 'divider' }),
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        backgroundColor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'primary.main',
                      }}
                    >
                      {fileExtension(file.name)}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography title={file.name} sx={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {truncateMiddle(file.name, 34)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: '2px' }}>
                        {fileSizeLabel(file.size)}
                        {isImage ? ` · ${t('rag:imageRequiresAdvancedParsing')}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                  {isPdf ? (
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={mode}
                      onChange={(_e, value) => {
                        if (!value) return
                        setAdvancedParsing((prev) => {
                          const next = [...prev]
                          next[idx] = value === 'advanced'
                          return next
                        })
                      }}
                      sx={{
                        flexShrink: 0,
                        '& .MuiToggleButton-root': {
                          textTransform: 'none',
                          px: 1.75,
                          py: 0.75,
                          '&:hover': { backgroundColor: 'transparent' },
                        },
                        '& .MuiToggleButton-root.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': { backgroundColor: 'primary.main' },
                        },
                      }}
                    >
                      <ToggleButton value="standard">{t('rag:standardParsing')}</ToggleButton>
                      <ToggleButton value="advanced">{t('rag:advancedParsing')}</ToggleButton>
                    </ToggleButtonGroup>
                  ) : (
                    <Typography variant="body2" sx={{ flexShrink: 0, color: 'text.secondary' }}>
                      {isImage ? t('rag:advancedParsing') : t('rag:standardParsing')}
                    </Typography>
                  )}
                </Box>
              )
            })}
          </Box>
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
