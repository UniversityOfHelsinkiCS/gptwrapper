import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, InfoOutlined, EditOutlined, Close } from '@mui/icons-material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Dialog, Divider, List, ListItemButton, ListItemText, Typography, Paper } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Prompt as PromptType } from '../../types'
import { PromptEditor } from '../Prompt/PromptEditor'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import { usePromptState } from './PromptState'
import { PromptInfoContent } from '../Prompt/PromptInfoContent'
import { Tab, Tabs, IconButton } from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

const PromptModal = () => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [infoModalPrompt, setInfoModalPrompt] = useState<PromptType | undefined>()
  const [previewPrompt, setPreviewPrompt] = useState<PromptType | undefined>()

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)

  const amongResponsibles = chatInstance?.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user?.id) : false

  const handleSelect = (prompt?: PromptType) => {
    handleChangePrompt(prompt)
    navigate(`/${courseId}`)
  }

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    try {
      if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) {
        await deletePromptMutation(prompt.id)
        enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, {
          variant: 'success',
        })
        if (previewPrompt?.id === prompt.id) setPreviewPrompt(undefined)
      }
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

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    const route = `/${courseId}/prompt/${prompt.id}`
    handleChangePrompt(prompt)
    navigate(route)
  }

  const handleCreateNew = () => {
    setCreateNewOpen((prev) => !prev)
    handleChangePrompt(undefined)
  }

  const handleShowInfo = (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    setInfoModalPrompt(prompt)
    setInfoModalOpen(true)
  }

  const canCreatePrompt = courseId === 'general' || tab === 1 || amongResponsibles

  const currentPrompts = courseId !== 'general' && tab === 0 ? coursePrompts : myPrompts
  const isPersonalTab = courseId === 'general' || tab === 1

  const renderPromptListItem = (prompt: PromptType) => (
    <ListItemButton
      key={prompt.id}
      selected={previewPrompt?.id === prompt.id}
      onClick={() => setPreviewPrompt(prompt)}
      sx={{
        borderRadius: '8px',
        mb: 0.5,
        py: 1.5,
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.main',
        },
      }}
      data-testid={`prompt-row-${prompt.name}`}
    >
      <ListItemText primary={prompt.name} primaryTypographyProps={{ fontWeight: previewPrompt?.id === prompt.id ? 'bold' : 'normal', noWrap: true }} />
      {prompt.id === activePrompt?.id && <CheckCircleOutlineIcon color="success" fontSize="small" sx={{ ml: 1 }} />}
    </ListItemButton>
  )

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => {
          setTab(newValue)
          setCreateNewOpen(false)
          setPreviewPrompt(undefined)
        }}
        slotProps={{
          indicator: { style: { backgroundColor: 'black' } },
        }}
        textColor="inherit"
      >
        {courseId !== 'general' && <Tab label={t('settings:coursePrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />}
        <Tab label={t('settings:myPrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, minHeight: '50vh' }}>
        {/* Left panel - prompt list */}
        <Box sx={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column' }}>
          {canCreatePrompt && (
            <TextButton
              data-testid="create-prompt-button"
              sx={{ mb: 1 }}
              onClick={handleCreateNew}
              startIcon={<Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>+</Typography>}
            >
              {t('settings:saveNewPrompt')}
            </TextButton>
          )}

          <List sx={{ flex: 1, overflowY: 'auto' }}>{currentPrompts.map((prompt) => renderPromptListItem(prompt))}</List>

          {currentPrompts.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">{t('settings:noPrompts')}</Typography>
            </Box>
          )}
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Right panel - preview */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {previewPrompt ? (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  {previewPrompt.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={(e) => handleShowInfo(e, previewPrompt)}>
                    <InfoOutlined fontSize="small" />
                  </IconButton>
                  {(isPersonalTab || amongResponsibles) && (
                    <IconButton size="small" onClick={(e) => handleEdit(e, previewPrompt)} color="primary" data-testid={`edit-prompt-${previewPrompt.name}`}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  )}
                  {!isPersonalTab && (
                    <IconButton size="small" onClick={(e) => handleCopyLink(e, previewPrompt.id)}>
                      <ContentCopyOutlined fontSize="small" />
                    </IconButton>
                  )}
                  {(isPersonalTab || amongResponsibles) && (
                    <IconButton
                      size="small"
                      onClick={(event) => handleDelete(event, previewPrompt)}
                      color="error"
                      data-testid={`delete-prompt-${previewPrompt.name}`}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {previewPrompt.userInstructions && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Instructions
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewPrompt.userInstructions}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('chat:systemMessage')}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: previewPrompt.hidden ? 'text.disabled' : 'text.primary' }}>
                  {previewPrompt.hidden ? t('common:hiddenPromptInfo') : previewPrompt.systemMessage || '—'}
                </Typography>
              </Box>

              <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <OutlineButtonBlack onClick={() => handleSelect(previewPrompt)}>{t('settings:choosePrompt')}</OutlineButtonBlack>
              </Box>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
              <Typography>{t('settings:noPrompt')}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        fullWidth
        open={createNewOpen}
        onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setCreateNewOpen(false)
        }}
      >
        {courseId !== 'general' && tab === 0 && <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} />}
        {(courseId === 'general' || tab === 1) && <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} personal />}
      </Dialog>

      <Dialog fullWidth maxWidth="md" open={infoModalOpen} onClose={() => setInfoModalOpen(false)}>
        <Box sx={{ position: 'relative', p: 3 }}>
          <IconButton onClick={() => setInfoModalOpen(false)} sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }} data-testid="close-info-modal">
            <Close />
          </IconButton>
          {infoModalPrompt && (
            <PromptInfoContent
              name={infoModalPrompt.name}
              userInstructions={infoModalPrompt.userInstructions ?? ''}
              systemMessage={infoModalPrompt.systemMessage}
              hidden={infoModalPrompt.hidden}
              type={infoModalPrompt.type}
              isTeacher={amongResponsibles}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  )
}

export default PromptModal
