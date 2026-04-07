import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, EditOutlined, Close, ClearOutlined } from '@mui/icons-material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Dialog, Divider, List, ListItemButton, ListItemText, Typography, Paper, Button, Tooltip } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Prompt as PromptType } from '../../types'
import { PromptEditor2 } from '../Prompt/PromptEditor2'
import { usePromptState } from './PromptState'
import { Tab, Tabs, IconButton } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BlueButton, OutlineButtonBlue } from './general/Buttons.tsx'
import ConfirmDialog from './general/ConfirmDialog'

const PromptModal = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<PromptType | null>(null)
  const [tab, setTab] = useState(0)
  const [previewPrompts, setPreviewPrompts] = useState<Record<number, PromptType | undefined>>(isMobile ? {} : { [tab]: activePrompt })
  const previewPrompt = previewPrompts[tab]
  const setPreviewPrompt = (prompt: PromptType | undefined) => setPreviewPrompts((prev) => ({ ...prev, [tab]: prompt }))
  const [isEditing, setIsEditing] = useState(false)

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)

  const amongResponsibles = chatInstance?.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user?.id) : false

  const onDone = (promptId) => {
    setIsEditing(false)
  }

  const handleSelect = (prompt?: PromptType) => {
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
    setCreateNewOpen((prev) => !prev)
    handleChangePrompt(undefined)
  }

  const handleMobileBackToPromptList = () => {
    setPreviewPrompt(undefined)
  }

  const canCreatePrompt = courseId === 'general' || tab === 1 || amongResponsibles

  const currentPrompts = courseId !== 'general' && tab === 0 ? coursePrompts : myPrompts
  const isPersonalTab = courseId === 'general' || tab === 1

  useEffect(() => {
    if (previewPrompt) {
      const currentPrompt = currentPrompts.find((prompt) => previewPrompt.id === prompt.id)
      setPreviewPrompt(currentPrompt)
    }
  }, [currentPrompts])

  const renderPromptListItem = (prompt: PromptType) => (
    <ListItemButton
      key={prompt.id}
      selected={previewPrompt?.id === prompt.id}
      onClick={() => {
        setPreviewPrompt(prompt)
        setIsEditing(false)
      }}
      sx={{
        borderRadius: '8px',
        mb: 0.5,
        py: 1,
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.main',
        },
      }}
      data-testid={`prompt-row-${prompt.name}`}
    >
      <ListItemText primary={prompt.name} primaryTypographyProps={{ fontWeight: previewPrompt?.id === prompt.id ? 'bold' : 'normal', noWrap: true }} />
      {prompt.id === activePrompt?.id && <CheckCircleOutlineIcon fontSize="small" sx={{ ml: 1, color: 'text.primary' }} />}
      {previewPrompt?.id === prompt.id && prompt.id !== activePrompt?.id && (
        <BlueButton
          size="small"
          variant="contained"
          data-testid="change-to-prompt-button"
          onClick={(e) => {
            e.stopPropagation()
            handleSelect(prompt)
          }}
          sx={{ ml: 1, whiteSpace: 'nowrap' }}
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
          setTab(newValue)
          setCreateNewOpen(false)
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
            display: !isMobile || !previewPrompt ? 'flex' : 'none',
            width: !isMobile ? 280 : '90vw',
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

          <List sx={{ flex: 1, overflowY: 'auto' }}>{currentPrompts.map((prompt) => renderPromptListItem(prompt))}</List>

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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" data-testid={`prompt-preview-title-for-${previewPrompt.name}`}>
                      {previewPrompt.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {(isPersonalTab || amongResponsibles) && (
                        <Tooltip arrow placement="bottom" title={t('prompt:editPromptTooltip')}>
                          <IconButton size="small" onClick={(e) => handleEdit()} color="primary" data-testid={`edit-prompt-${previewPrompt.name}`}>
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
                      {(isPersonalTab || amongResponsibles) && (
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
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        {t('prompt:promptInstructions')}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {previewPrompt.userInstructions}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mb: 3 }}>
                    <Box gap={1} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        {t('prompt:systemMessage')}
                      </Typography>
                      {previewPrompt.hidden && (
                        <Typography variant="h6" color="textDisabled" gutterBottom>
                          {`(${t('prompt:promptHidden')})`}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: previewPrompt.hidden ? 'text.disabled' : 'text.primary' }}>
                      {previewPrompt.hidden && !amongResponsibles ? t('common:hiddenPromptInfo') : previewPrompt.systemMessage || '—'}
                    </Typography>
                  </Box>
                </Paper>
                {isMobile && (
                  <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <OutlineButtonBlue onClick={() => handleMobileBackToPromptList()}>
                      <ArrowBackIcon />
                      {t('prompt:backToPromptList')}
                    </OutlineButtonBlue>
                    <BlueButton data-testid="change-to-prompt-button" variant="contained" onClick={() => handleSelect(previewPrompt)}>
                      {t('settings:choosePrompt')}
                    </BlueButton>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                <Typography>{t('settings:noPrompt')}</Typography>
              </Box>
            )}
          </Box>
        )}
        {isEditing && (
          <Box sx={{ display: !isMobile || previewPrompt ? 'flex' : 'none', maxWidth: !isMobile ? '100%' : '90vw', flex: 1, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, minHeight: 0 }}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', overflow: 'auto', maxHeight: '100%' }}>
                <PromptEditor2 previewPrompt={previewPrompt} onDone={onDone} />
                <BlueButton onClick={() => handleEdit()}> BÄKKIIN </BlueButton>
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
