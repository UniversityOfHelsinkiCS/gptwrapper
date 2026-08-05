import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, EditOutlined, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, Typography, Paper, Tooltip, IconButton, Alert, List, ListItem, ListItemText } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useTranslation } from 'react-i18next'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Prompt, Course } from '../../types'
import { usePromptState } from './PromptState'
import PsychologyIcon from '@mui/icons-material/Psychology'
import { useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { monospaceStyle } from '../../theme'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import { useRagIndexDetails } from '../Rag/api.ts'
import { orderBy } from 'lodash'
import { TextButton } from './general/Buttons.tsx'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

const ragFileBadge = (filename: string, fileType?: string) => {
  const ext = filename.includes('.') ? filename.split('.').pop()?.toUpperCase() : fileType?.split('/').pop()?.toUpperCase()
  const label = (ext ?? 'FILE').slice(0, 4)

  if (label === 'PDF') return { label, palette: 'error' as const }
  if (label === 'PPTX' || label === 'PPT') return { label, palette: 'warning' as const }
  if (label === 'PNG' || label === 'JPG' || label === 'JPEG') return { label, palette: 'secondary' as const }
  return { label, palette: 'primary' as const }
}

const PromptPreview = ({
  prompt,
  handleEdit,
  handleDelete,
  courses,
}: {
  prompt: Prompt
  handleEdit: (courseId?: string) => void
  handleDelete: (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => void
  courses: Course[]
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { myPrompts } = usePromptState()
  const { t } = useTranslation()
  const { user } = useCurrentUser()

  const courseId = courses.find((course) => course.id === prompt?.chatInstanceId)?.courseId ?? 'general'
  const { data: chatInstance } = useCourse(courseId)

  const rag = chatInstance?.prompts.find((p) => p.id === prompt.id)?.ragIndex

  const amongResponsibles = chatInstance?.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user?.id) : false

  const isPersonalPrompt = prompt.type === 'PERSONAL' || myPrompts.some((p) => p.id === prompt.id)

  const shouldFetchRagDetails = amongResponsibles || user?.isAdmin || isPersonalPrompt
  const { data: ragDetails } = useRagIndexDetails(prompt.ragIndexId ?? null, shouldFetchRagDetails)

  const ragFiles = ragDetails?.ragFiles.filter((file) => file.pipelineStage === 'completed' && !file.error) ?? []

  const handleCopyLink = (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => {
    event.stopPropagation()
    const link = `${window.location.origin}${PUBLIC_URL}/${chatInstance?.courseId}?promptId=${prompt.id}`
    navigator.clipboard.writeText(link)
    enqueueSnackbar(t('common:copiedToClipboard'), { variant: 'success' })
  }

  if (!user) return null
  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
      {amongResponsibles || user.isAdmin ? (
        <Box>
          {(() => {
            const promptCreator = chatInstance?.responsibilities.find((u) => u.user.id === prompt.userId)
            const hasCreatorInfo = promptCreator && promptCreator.user.first_names && promptCreator.user.last_name
            return (
              <>
                {hasCreatorInfo ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="light" data-testid={`prompt-preview-creator-for-${prompt.name}`}>
                      {`${promptCreator.user.first_names.split(' ')[0]} ${promptCreator.user.last_name}`}
                    </Typography>
                  </Box>
                ) : null}
              </>
            )
          })()}
        </Box>
      ) : (
        <>
          {user.id === prompt.userId && user.firstNames ? (
            <Typography variant="body2" fontWeight="light" data-testid={`prompt-preview-creator-for-${prompt.name}`}>
              {`${user.firstNames.split(' ')[0]} ${user.lastName ?? ''}`}
            </Typography>
          ) : null}
        </>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, mt: 2 }}>
        <Box sx={{ flexDirection: 'column', display: 'flex', gap: 1, maxWidth: '80%' }}>
          <Typography variant="h4" fontWeight="bold" data-testid={`prompt-preview-title-for-${prompt.name}`} sx={{ wordBreak: 'break-word' }}>
            {prompt.name}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {(prompt.userId === user.id || user.isAdmin) && (
            <Tooltip arrow placement="bottom" title={t('prompt:editPromptTooltip')}>
              <IconButton size="small" onClick={() => handleEdit(courseId)} color="primary" data-testid={`edit-prompt-${prompt.name}`}>
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!isPersonalPrompt && (
            <Tooltip arrow placement="bottom" title={t('prompt:copyPromptUrlTooltip')}>
              <IconButton size="small" onClick={(e) => handleCopyLink(e, prompt)}>
                <ContentCopyOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(prompt.userId === user.id || user.isAdmin) && (
            <Tooltip arrow placement="bottom" title={t('prompt:deletePromptTooltip')}>
              <IconButton size="small" onClick={(event) => handleDelete(event, prompt)} color="error" data-testid={`delete-prompt-${prompt.name}`}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {prompt.userInstructions && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {prompt.userInstructions}
          </Typography>
        </Box>
      )}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ mb: 3 }}>
        <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
              {t('prompt:promptModelSettings')}
            </Typography>
          </Box>
          {!isPersonalPrompt && (amongResponsibles || user.isAdmin) && (
            <Box display="flex" alignItems="center" gap={1}>
              {prompt.hidden ? <VisibilityOffOutlined color="error" fontSize="inherit" /> : <VisibilityOutlined color="success" fontSize="inherit" />}
              <Typography variant="body2">{`${t(prompt.hidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Typography>
            </Box>
          )}
        </Box>
        {!isPersonalPrompt && prompt.hidden && !user?.isAdmin && !amongResponsibles ? (
          <Alert icon={<VisibilityOffOutlined fontSize="inherit" />} severity="info" sx={{ mt: 1.5 }}>
            {t('common:hiddenPromptInfo')}
          </Alert>
        ) : (
          <Paper sx={{ p: 3, mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...(!isMobile && { maxHeight: '300px', overflow: 'auto' }) }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
              {prompt.systemMessage || '—'}
            </Typography>
          </Paper>
        )}
      </Box>
      {(!isPersonalPrompt || (isPersonalPrompt && ragDetails)) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb: 1.5, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BookmarksIcon color="secondary" />
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {t('prompt:promptSourceMaterialData')}
              </Typography>
            </Box>
            {!isPersonalPrompt && (amongResponsibles || user.isAdmin) && (
              <Box display="flex" alignItems="center" gap={1}>
                {prompt.ragHidden ? <VisibilityOffOutlined color="error" fontSize="inherit" /> : <VisibilityOutlined color="success" fontSize="inherit" />}
                <Typography variant="body2">{`${t(prompt.ragHidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Typography>
              </Box>
            )}
          </Box>

          {ragDetails ? (
            <Paper sx={{ p: 2, mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...(!isMobile && { maxHeight: '300px', overflow: 'auto' }) }}>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  mb: 5,
                  flexDirection: 'column',
                  display: 'flex',
                  mt: 1.5,
                  p: 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, pt: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                    {ragDetails.metadata.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {t('rag:fileCountLabel', { count: ragFiles.length })}
                  </Typography>
                </Box>

                <Divider sx={{ mx: 2, mb: 1 }} />

                {ragFiles.length > 0 ? (
                  <List disablePadding>
                    {orderBy(ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (
                      <ListItem key={file.id} sx={{ py: 0.75, px: 2 }}>
                        <Box
                          sx={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.75,
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: file.pipelineStage === 'error' || file.error ? (theme) => alpha(theme.palette.error.main, 0.05) : 'transparent',
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              backgroundColor: (theme) => alpha(theme.palette[ragFileBadge(file.filename, file.fileType).palette].main, 0.13),
                              color: (theme) => theme.palette[ragFileBadge(file.filename, file.fileType).palette].main,
                            }}
                          >
                            {ragFileBadge(file.filename, file.fileType).label}
                          </Box>

                          <ListItemText
                            primary={file.filename}
                            slotProps={{
                              primary: { variant: 'body2', sx: { fontWeight: 500 } },
                            }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : null}
              </Box>
            </Paper>
          ) : rag ? (
            prompt.ragHidden && !(amongResponsibles || user.isAdmin) ? (
              <Alert icon={<VisibilityOffOutlined fontSize="inherit" />} severity="info" sx={{ mt: 1.5 }}>
                {t('common:hiddenRag')}
              </Alert>
            ) : (
              <Box
                sx={{
                  mb: 5,
                  flexDirection: 'column',
                  display: 'flex',
                  gap: 1,
                  mt: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                  {rag.metadata.name}
                </Typography>
              </Box>
            )
          ) : (
            <Paper sx={{ mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...(!isMobile && { maxHeight: '300px', overflow: 'auto' }) }}>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  mb: 5,
                  flexDirection: 'column',
                  display: 'flex',
                  mt: 1.5,
                  p: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 2, pt: 2 }}>
                  <Typography variant="body2" color="text.primary">
                    {t('prompt:noRag')}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}
          {(prompt.userId === user.id || user.isAdmin) && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <TextButton
                onClick={() => {
                  const params = new URLSearchParams()
                  if (ragDetails) {
                    params.set('ragId', ragDetails.id.toString())
                  }
                  window.open(`/general/userrags?${params.toString()}`, '_blank')
                }}
                data-testid="edit-source-material-link"
                endIcon={<OpenInNewIcon color="primary" />}
              >
                <span data-testid="edit-source-material-button" style={{ color: theme.palette.primary.main }}>
                  {t('rag:editSourceMaterial')}
                </span>
              </TextButton>
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}

export default PromptPreview
