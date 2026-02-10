import { PUBLIC_URL } from '@config'
import { ContentCopyOutlined, InfoOutlined, EditOutlined, Close } from '@mui/icons-material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Dialog, Typography } from '@mui/material'
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

const PromptModal = () => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [infoModalPrompt, setInfoModalPrompt] = useState<PromptType | undefined>()

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

  const renderPromptItem = (prompt: PromptType, isPersonal: boolean) => (
    <Box
      key={prompt.id}
      onClick={() => handleSelect(prompt)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        cursor: 'pointer',
        backgroundColor: prompt.id === activePrompt?.id ? 'action.selected' : 'transparent',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
      data-testid={`prompt-row-${prompt.name}`}
    >
      <Typography>{prompt.name}</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextButton
          startIcon={<InfoOutlined fontSize="small" />}
          onClick={(e) => handleShowInfo(e, prompt)}
          sx={{ minWidth: 'auto' }}
        >
          {t('common:info')}
        </TextButton>
        {(isPersonal || amongResponsibles) && (
          <TextButton
            startIcon={<EditOutlined fontSize="small" />}
            onClick={(e) => handleEdit(e, prompt)}
            color="primary"
            data-testid={`edit-prompt-${prompt.name}`}
            sx={{ minWidth: 'auto' }}
          >
            {t('common:edit')}
          </TextButton>
        )}
        {!isPersonal && (
          <TextButton
            startIcon={<ContentCopyOutlined fontSize="small" />}
            onClick={(e) => handleCopyLink(e, prompt.id)}
            sx={{ minWidth: 'auto' }}
          >
            {t('common:link')}
          </TextButton>
        )}
        {(isPersonal || amongResponsibles) && (
          <TextButton
            startIcon={<DeleteOutline fontSize="small" />}
            onClick={(event) => handleDelete(event, prompt)}
            color="error"
            data-testid={`delete-prompt-${prompt.name}`}
            sx={{ minWidth: 'auto' }}
          >
            {t('common:delete')}
          </TextButton>
        )}
      </Box>
    </Box>
  )

  const renderPromptList = (prompts: PromptType[], isPersonal: boolean) => (
    <Box>
      {prompts.map((prompt) => renderPromptItem(prompt, isPersonal))}
    </Box>
  )

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => {
          setTab(newValue)
          setCreateNewOpen(false)
        }}
        slotProps={{
          indicator: { style: { backgroundColor: 'black' } },
        }}
        textColor="inherit"
      >
        {courseId !== 'general' && <Tab label={t('settings:coursePrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />}
        <Tab label={t('settings:myPrompts')} sx={{ '&.Mui-selected': { fontWeight: 'bold' } }} />
      </Tabs>
      <Box sx={{ display: 'flex', flex: 1, gap: 2, overflow: 'hidden', mt: 2 }}>
        <Box sx={{ flex: '1', overflowY: 'auto' }}>
          {canCreatePrompt && (
            <TextButton 
              data-testid="create-prompt-button" 
              sx={{ mb: 2 }} 
              onClick={handleCreateNew}
              startIcon={<Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>+</Typography>}
            >
              {t('settings:saveNewPrompt')}
            </TextButton>
          )}

          {courseId !== 'general' && tab === 0 && coursePrompts.length > 0 && renderPromptList(coursePrompts, false)}

          {(courseId === 'general' || tab === 1) && myPrompts.length > 0 && renderPromptList(myPrompts, true)}

          {myPrompts.length === 0 && coursePrompts.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>{t('settings:noPrompts')}</Typography>
            </Box>
          )}
        </Box>

        <Dialog fullWidth open={createNewOpen} onClose={(_event, reason) => {
          if (reason === 'backdropClick') return
          setCreateNewOpen(false)
        }}>
          {courseId !== 'general' && tab === 0 && <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} />}
          {(courseId === 'general' || tab === 1) && <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} personal />}
        </Dialog>

        <Dialog 
          fullWidth 
          maxWidth="md"
          open={infoModalOpen} 
          onClose={() => setInfoModalOpen(false)}
        >
          <Box sx={{ position: 'relative', p: 3 }}>
            <IconButton
              onClick={() => setInfoModalOpen(false)}
              sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
              data-testid="close-info-modal"
            >
              <Close />
            </IconButton>
            {infoModalPrompt && (
              <PromptInfoContent
                name={infoModalPrompt.name}
                userInstructions={infoModalPrompt.userInstructions ?? ''}
                systemMessage={infoModalPrompt.systemMessage}
                hidden={infoModalPrompt.hidden}
                type={infoModalPrompt.type}
              />
            )}
          </Box>
        </Dialog>
      </Box>
    </Box>
  )
}

export default PromptModal
