import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, EditOutlined, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, Typography, Paper, Tooltip, IconButton, Alert, List, ListItemButton, ListItem, ListItemText, Collapse } from '@mui/material'
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
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useState } from 'react'
import { orderBy } from 'lodash'

const PromptPreview = ({
  prompt,
  handleEdit,
  handleDelete,
  courses
}: {
  prompt: Prompt,
  handleEdit: (courseId?: string) => void,
  handleDelete: (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => void,
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
  const [showRagFiles, setShowRagFiles] = useState(false)
  
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
                ) : ( null )}
              </>
            )
          })()}
        </Box>
      ) : (
      <>
        {user.id === prompt.userId ? (
          <Typography variant="body2" fontWeight="light" data-testid={`prompt-preview-creator-for-${prompt.name}`}>
            {`${user.firstNames.split(' ')[0]} ${user.lastName}`}
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
          {(prompt.userId === user.id || user.isAdmin)  && (
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
              <IconButton
                size="small"
                onClick={(event) => handleDelete(event, prompt)}
                color="error"
                data-testid={`delete-prompt-${prompt.name}`}
              >
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
        <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <PsychologyIcon color="secondary" />
          <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
            {t('prompt:promptModelSettings')}
          </Typography>
        </Box>
        {!isPersonalPrompt && (amongResponsibles || user.isAdmin) && (
          <Alert
            icon={
              prompt.hidden ? (
                <VisibilityOffOutlined color="error" fontSize="inherit" />
              ) : (
                <VisibilityOutlined color="success" fontSize="inherit" />
              )
            }
            severity="info"
          >{`${t(prompt.hidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Alert>
        )}
        <Paper variant="outlined" sx={{ p: 3, mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...!isMobile && { maxHeight: '300px', overflow: 'auto' } }}>
          {isPersonalPrompt ? (
            <Typography variant="body2">
              {prompt.systemMessage || '—'}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
              {prompt.hidden && !user?.isAdmin && !amongResponsibles ? t('common:hiddenPromptInfo') : prompt.systemMessage || '—'}
            </Typography>
          )}
        </Paper>
      </Box>
      {(!isPersonalPrompt || (isPersonalPrompt && ragDetails)) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <BookmarksIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
              {t('prompt:promptSourceMaterialData')}
            </Typography>
          </Box>
          {!isPersonalPrompt && (amongResponsibles || user.isAdmin) && (
            <Alert
              icon={
                prompt.ragHidden ? (
                  <VisibilityOffOutlined color="error" fontSize="inherit" />
                ) : (
                  <VisibilityOutlined color="success" fontSize="inherit" />
                )
              }
              severity="info"
            >{`${t(prompt.ragHidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Alert>
          )}
          {ragDetails ? (
            <Box sx={{ mb: 5, flexDirection: 'column', display: 'flex', gap: 1, mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
              {(ragDetails.ragFiles.some((file) => file.pipelineStage === 'completed') && (amongResponsibles || user.isAdmin)) ? (
                <List disablePadding>
                  <ListItemButton onClick={() => setShowRagFiles((open) => !open)} sx={{ px: 1, borderRadius: 1 }}>
                    <ListItemText
                      primary={ragDetails.metadata.name}
                      slotProps={{ primary: { variant: 'body2' } }}
                    />
                    {showRagFiles ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </ListItemButton>
                  <Collapse in={showRagFiles} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {orderBy(ragDetails.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (file.pipelineStage === 'completed' ? (
                        <ListItem key={file.id} sx={{ pl: 4, py: 0.25, borderRadius: 1 }}>
                          <ListItemText
                            primary={file.filename}
                            slotProps={{ primary: { variant: 'body2' } }}
                          />
                        </ListItem>
                      ) : null))}
                    </List>
                  </Collapse>
                </List>
              ) : (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                  {ragDetails.metadata.name}
                </Typography>
              )}
            </Box>
          ) : rag ? (
            <Box sx={{ mb: 5, flexDirection: 'column', display: 'flex', gap: 1, mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                {prompt.ragHidden && !(amongResponsibles || user.isAdmin) ? t('common:hiddenRag') : rag.metadata.name}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 3, ml: 2, mt: 5 }}>
              <Typography variant="body2">{t('prompt:noRag')}</Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  )
}

export default PromptPreview