import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, EditOutlined, ClearOutlined, VisibilityOffOutlined, VisibilityOutlined } from '@mui/icons-material'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, List, ListItemButton, ListItem, ListItemText, Typography, Paper, Button, Tooltip, Alert, Collapse } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Prompt as PromptType } from '../../types'
import { PromptEditor } from '../Prompt/PromptEditor'
import { usePromptState } from './PromptState'
import { Tab, Tabs, IconButton } from '@mui/material'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useMediaQuery, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BlueButton, OutlineButtonBlue } from './general/Buttons.tsx'
import ConfirmDialog from './general/ConfirmDialog'
import { monospaceStyle } from '../../theme'
import BookmarksIcon from '@mui/icons-material/Bookmarks'
import { useRagIndexDetails } from '../Rag/api.ts'
import { orderBy } from 'lodash'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import { usePromptEditorState } from '../Prompt/context.tsx'

const PromptModal = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [deleteConfirm, setDeleteConfirm] = useState<PromptType | null>(null)
  const [tab, setTab] = useState(0)
  const [previewPrompts, setPreviewPrompts] = useState<Record<number, PromptType | undefined>>(isMobile ? {} : { [tab]: activePrompt })
  const previewPrompt = previewPrompts[tab]
  const setPreviewPrompt = (prompt: PromptType | undefined) => setPreviewPrompts((prev) => ({ ...prev, [tab]: prompt }))
  const [isEditing, setIsEditing] = useState(false)
  const [showRagFiles, setShowRagFiles] = useState(false)
  const { data: ragDetails} = useRagIndexDetails(previewPrompt?.ragIndexId ?? null)

  const { hasChanges, setHasChanges, cacheKey, setCacheKey } = usePromptEditorState()

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)

  const courseResponsibilities = chatInstance?.responsibilities || []
 
  const { ragIndices } = useCourseRagIndices(chatInstance?.id, false)
  const rag = ragIndices?.find((r) => r.id === previewPrompt?.ragIndexId)

  const amongResponsibles = chatInstance?.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user?.id) : false

  const onDone = (prompt?: PromptType) => {
    setIsEditing(false)
    setPreviewPrompt(prompt)
  }

  const handleSelect = (prompt?: PromptType) => {
    if (!confirmClose()) return
    handleChangePrompt(prompt)
    navigate(`/${courseId}`)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    setDeleteConfirm(prompt)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    const prompt = deleteConfirm
    setDeleteConfirm(null)
    try {
      await deletePromptMutation(prompt.id)
      enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, { variant: 'success' })
      if (previewPrompt?.id === prompt.id) setPreviewPrompt(undefined)
    } catch (error) {
      enqueueSnackbar(`Error: ${error}`, { variant: 'error' })
    }
  }

  const handleCopyLink = (event: React.MouseEvent<HTMLButtonElement>, promptId: string) => {
    event.stopPropagation()
    const link = `${window.location.origin}${PUBLIC_URL}/${courseId}?promptId=${promptId}`
    navigator.clipboard.writeText(link)
    enqueueSnackbar(t('common:copiedToClipboard'), { variant: 'success' })
  }

  const handleEdit = () => {
    setIsEditing(!isEditing)
  }

  const handleCreateNew = () => {
    if (!confirmClose()) return
    if (isEditing) {
      setIsEditing(false)
      return
    }
    setPreviewPrompt(undefined)
    setIsEditing(true)
  }

  const handleMobileBackToPromptList = () => {
    setPreviewPrompt(undefined)
  }

  const canCreatePrompt = courseId === 'general' || tab === 1 || amongResponsibles

  const currentPrompts = courseId !== 'general' && tab === 0 ? coursePrompts : myPrompts
  const isPersonalTab = courseId === 'general' || tab === 1
  const shouldOpenEditorFromQuery = searchParams.get('editPrompt') === '1'
  const promptId = searchParams.get('promptId')
  const promptTab = Number(searchParams.get('promptTab'))

  useEffect(() => {
    if (previewPrompt) {
      const currentPrompt = currentPrompts.find((prompt) => previewPrompt.id === prompt.id)
      setPreviewPrompt(currentPrompt)
    }
  }, [currentPrompts])

  useEffect(() => {
    setShowRagFiles(false)
  }, [previewPrompt?.id])

  useEffect(() => {
    if (!shouldOpenEditorFromQuery) return

    const targetTab = Number.isFinite(promptTab) ? promptTab : courseId === 'general' ? 1 : 0
    const promptSource = targetTab === 0 ? coursePrompts : myPrompts
    const requestedPrompt = promptSource.find((prompt) => prompt.id === promptId)
    const hasLoadedPrompts = promptSource.length > 0

    if (previewPrompt && promptId && !requestedPrompt && !hasLoadedPrompts) return

    if (tab !== targetTab) {
      setTab(targetTab)
    }

    if (!promptId) {
      setPreviewPrompt(undefined)
    }

    setPreviewPrompts((prev) => ({ ...prev, [targetTab]: requestedPrompt }))

    setIsEditing(true)
    navigate(`/${courseId}/prompts`, { replace: true })
  }, [shouldOpenEditorFromQuery, promptId, promptTab, coursePrompts, myPrompts, courseId, tab, navigate])

  const confirmClose = () => {
    if (!hasChanges || !isEditing) return true

    const shouldClose = window.confirm(
      t('prompt:unSavedChanges'),
    )

    if (!shouldClose) return false

    setHasChanges(false)
    localStorage.removeItem(cacheKey)
    setCacheKey('')
    return true
  }

  const sortedPrompts = currentPrompts.sort((a, b) =>
    a.name.localeCompare(b.name, 'fi', { sensitivity: 'base' })
  )

  if (!user) return null

  const renderPromptListItem = (prompt: PromptType) => (
    <ListItemButton
      key={prompt.id}
      selected={previewPrompt?.id === prompt.id}
      onClick={() => {
        if (!confirmClose()) return
        setPreviewPrompt(prompt)
        setIsEditing(false)
      }}
      sx={{
        position: 'relative',
        borderRadius: '8px',
        mb: 0.5,
        py: 1,
        height: '50px',
        minHeight: '50px',
        pr: prompt.id === activePrompt?.id ? 10 : 0.5,
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.main',
        },
        '& .change-prompt-button': {
          opacity: 0,
          transform: 'translateX(4px)',
          visibility: 'hidden',
          pointerEvents: 'none',
          transition: 'opacity 180ms ease, transform 180ms ease, visibility 0s linear 180ms',
        },
        '& .prompt-list-item__text': {
          transition: 'padding-right 180ms ease',
          transitionDelay: '200ms',
        },
        '&:hover .change-prompt-button:not(.change-prompt-button--active)': {
          opacity: 1,
          transform: 'translateX(0)',
          visibility: 'visible',
          pointerEvents: 'auto',
          transitionDelay: '200ms',
        },
        '&:hover .prompt-list-item__text': {
          pr: prompt.id === activePrompt?.id ? 3 : 10,
        },
      }}
      data-testid={`prompt-row-${prompt.name}`}
    >
      <ListItemText
        className="prompt-list-item__text"
        primary={prompt.name}
        slotProps={{ primary: { noWrap: true } }}
        sx={{ minWidth: 0 }}
      />
      {prompt.id === activePrompt?.id && (
        <CheckCircleOutlineIcon fontSize="small" sx={{ position: 'absolute', right: 16, color: 'text.primary' }} />
      )}
      {prompt.id !== activePrompt?.id && (
        <BlueButton
          size="small"
          variant="contained"
          data-testid="change-to-prompt-button"
          className={prompt.id === activePrompt?.id ? 'change-prompt-button change-prompt-button--active' : 'change-prompt-button'}
          onClick={(e) => {
            e.stopPropagation()
            if (!confirmClose()) return        
            handleSelect(prompt)
          }}
          sx={{ position: 'absolute', right: 8, whiteSpace: 'nowrap' }}
        >
          {t('settings:choosePrompt')}
        </BlueButton>
      )}
    </ListItemButton>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => {
          if (!confirmClose()) return
          setTab(newValue)
          setIsEditing(false)
        }}
        slotProps={{
          indicator: { sx: { backgroundColor: 'text.primary' } },
        }}
        textColor="inherit"
      >
        {courseId !== 'general' && <Tab label={t('settings:coursePrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />}
        <Tab label={t('settings:myPrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, flex: 1, minHeight: 0 }}>
        {/* Left panel - prompt list */}
        <Box
          sx={{
            display: !isMobile || (!previewPrompt && !isEditing) ? 'flex' : 'none',
            width: !isMobile ? 310 : '90vw',
            flexDirection: 'column',
          }}
        >
          {canCreatePrompt && (
            <Button
              variant="contained"
              data-testid="create-prompt-button"
              sx={{ mb: 1 }}
              onClick={handleCreateNew}
              startIcon={<Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>+</Typography>}
            >
              {t('settings:saveNewPrompt')}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => handleSelect()}
            sx={{
              color: 'text.primary',
              border: '2px solid',
              borderColor: 'divider',
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'divider',
              },
            }}
            startIcon={<ClearOutlined sx={{ fontSize: '1.5rem', lineHeight: 1 }} />}
          >
            {t('sidebar:promptNone')}
          </Button>
          <Divider sx={{ p: 1 }} />
          <List sx={{ flex: 1, overflowY: 'auto' }}>{sortedPrompts.map((prompt) => renderPromptListItem(prompt))}</List>
          {currentPrompts.length === 0 && (
            <Box sx={{ p: 3, color: 'text.secondary' }}>
              <Typography variant="body2">{t('settings:noPrompts')}</Typography>
            </Box>
          )}
        </Box>
        <Divider sx={{ display: isMobile ? 'none' : 'flex' }} orientation="vertical" flexItem />
        {/* Right panel - preview */}
        {!isEditing && (
          <Box sx={{ display: !isMobile || previewPrompt ? 'flex' : 'none', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            {previewPrompt ? (            
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                  {!isPersonalTab && (amongResponsibles || user.isAdmin) && (
                      <Box>
                        {(() => {
                          const promptCreator = courseResponsibilities.find((u) => u.user.id === previewPrompt.userId)
                          const hasCreatorInfo = promptCreator && promptCreator.user.first_names && promptCreator.user.last_name
                          return (
                            <>
                              {hasCreatorInfo && (previewPrompt.showCreator || previewPrompt.userId === user.id) ? (
                                <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight="light" data-testid={`prompt-preview-creator-for-${previewPrompt.name}`}>
                                  {t('prompt:creatorName', { firstNames: promptCreator.user.first_names.split(' ')[0], lastName: promptCreator.user.last_name })}
                                </Typography>
                                {previewPrompt.userId === promptCreator.user.id && !previewPrompt.showCreator && (
                                  <Tooltip placement="right" title={t('prompt:creatorHidden')} describeChild>
                                    <Box component="span" tabIndex={0} aria-label={t('prompt:creatorHidden')}>
                                      <VisibilityOffOutlined fontSize="small" color="error" />
                                    </Box>
                                  </Tooltip>
                                )}
                                </Box>
                              ) : ( null )}
                            </>
                          )
                        })()}
                      </Box>
                    
                    )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, mt: 2 }}>
                    <Box sx={{ flexDirection: 'column', display: 'flex', gap: 1, maxWidth: '80%' }}>  
                    <Typography variant="h4" fontWeight="bold" data-testid={`prompt-preview-title-for-${previewPrompt.name}`} sx={{ wordBreak: 'break-word' }}>
                      {previewPrompt.name}
                    </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {(previewPrompt.userId === user.id || user.isAdmin)  && (
                        <Tooltip arrow placement="bottom" title={t('prompt:editPromptTooltip')}>
                          <IconButton size="small" onClick={handleEdit} color="primary" data-testid={`edit-prompt-${previewPrompt.name}`}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!isPersonalTab && (
                        <Tooltip arrow placement="bottom" title={t('prompt:copyPromptUrlTooltip')}>
                          <IconButton size="small" onClick={(e) => handleCopyLink(e, previewPrompt.id)}>
                            <ContentCopyOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(previewPrompt.userId === user.id || user.isAdmin) && (
                        <Tooltip arrow placement="bottom" title={t('prompt:deletePromptTooltip')}>
                          <IconButton
                            size="small"
                            onClick={(event) => handleDelete(event, previewPrompt)}
                            color="error"
                            data-testid={`delete-prompt-${previewPrompt.name}`}
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  {previewPrompt.userInstructions && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {previewPrompt.userInstructions}
                      </Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 3 }} />
                  <Box sx={{ mb: 3 }}>
                    <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb:1.5 }}>
                      <PsychologyIcon color="secondary" />
                      <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                        {t('prompt:promptModelSettings')}
                      </Typography>
                    </Box>
                    {!isPersonalTab && (amongResponsibles || user.isAdmin) && (
                      <Alert
                        icon={
                          previewPrompt.hidden ? (
                            <VisibilityOffOutlined color="error" fontSize="inherit" />
                          ) : (
                            <VisibilityOutlined color="success" fontSize="inherit" />
                          )
                        }
                        severity="info"
                      >{`${t(previewPrompt.hidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Alert>
                    )}
                    <Paper variant="outlined" sx={{ p: 3, mt: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.08), ...!isMobile && { maxHeight: '300px', overflow: 'auto' } }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', ...monospaceStyle }}>
                        {previewPrompt.hidden && !amongResponsibles ? t('common:hiddenPromptInfo') : previewPrompt.systemMessage || '—'}
                      </Typography>
                    </Paper>
                  </Box>
                  <Divider sx={{ my: 3 }} />
                    <Box gap={1} sx={{ display: 'flex', alignItems: 'center', mb:1.5 }}>
                      <BookmarksIcon color="secondary" />
                      <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                          {t('prompt:promptSourceMaterialData')}
                      </Typography>
                    </Box>
                    {!isPersonalTab && (amongResponsibles || user.isAdmin) && (
                      <Alert
                        icon={
                          previewPrompt.ragHidden ? (
                            <VisibilityOffOutlined color="error" fontSize="inherit" />
                          ) : (
                            <VisibilityOutlined color="success" fontSize="inherit" />
                          )
                        }
                        severity="info"
                      >{`${t(previewPrompt.ragHidden ? 'prompt:promptHidden' : 'prompt:promptNotHidden')}`}</Alert>
                    )}
                  {rag ? (
                    <Box sx={{ mb: 5, flexDirection: 'column', display: 'flex', gap: 1, mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                      {(ragDetails && ragDetails.ragFiles.some((file) => file.pipelineStage === 'completed') && (amongResponsibles || user?.isAdmin)) ? (
                      <List disablePadding>                      
                        <ListItemButton onClick={() => setShowRagFiles((open) => !open)} sx={{ px: 1, borderRadius: 1 }}>
                          <ListItemText
                            primary={rag.metadata.name}
                            slotProps={{ primary: { variant: 'body2' } }}
                          />
                          {showRagFiles ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </ListItemButton>
                        <Collapse in={showRagFiles} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {orderBy(ragDetails?.ragFiles, [(f) => Date.parse(f.createdAt as unknown as string)], ['desc']).map((file) => (file.pipelineStage === 'completed' ? (
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
                        <Typography variant="body2">
                        {previewPrompt.ragHidden && !(amongResponsibles || user?.isAdmin) ? t('common:hiddenRag') : rag.metadata.name}
                      </Typography>

                      )}
                    </Box>
                  ) : (
                    <Box sx={{ mb: 3, ml: 2, mt: 5 }}>
                      <Typography variant="body2">{t('prompt:noRag')}</Typography> 
                    </Box>
                  )}
                </Paper>
                <Box sx={{ pt: 2, display: 'flex', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                  {isMobile && (
                    <OutlineButtonBlue onClick={() => handleMobileBackToPromptList()}>
                      <ArrowBackIcon />
                      {t('prompt:backToPromptList')}
                    </OutlineButtonBlue>
                  )}
                  <BlueButton data-testid="change-to-prompt-button" variant="contained" onClick={() => handleSelect(previewPrompt)}>
                    {t('settings:choosePrompt')}
                  </BlueButton>
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', height: '100%', color: 'text.secondary', pt: 4 }}>
                <Typography>{t('settings:noPrompt')}</Typography>
              </Box>
            )}
          </Box>
        )}
        {isEditing && (
          <Box sx={{ display:'flex', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                <PromptEditor previewPrompt={previewPrompt} onDone={onDone} personal={isPersonalTab} />
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={!!deleteConfirm}
        title={t('settings:confirmDeletePromptTitle')}
        message={t('settings:confirmDeletePrompt', { name: deleteConfirm?.name })}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </Box>
  )
}

export default PromptModal
