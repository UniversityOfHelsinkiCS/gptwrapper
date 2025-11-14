import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { ContentCopyOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import { Box, Divider, IconButton, MenuItem, Tab, Tabs, Link, Tooltip } from '@mui/material'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'

import { PUBLIC_URL } from '@config'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import type { Prompt as PromptType } from '../../types'
import { PromptEditor } from '../Prompt/PromptEditor'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import { usePromptState } from './PromptState'

const PromptModal = () => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [tab, setTab] = useState(0)

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)

  const amongResponsibles = chatInstance?.responsibilities
    ? chatInstance.responsibilities.some((r) => r.user.id === user?.id)
    : false

  const handleSelect = (prompt?: PromptType) => {
    handleChangePrompt(prompt)
  }

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    try {
      if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) {
        await deletePromptMutation(prompt.id)
        enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, { variant: 'success' })
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

  const canCreatePrompt = courseId === 'general' || tab === 1 || amongResponsibles

  const renderPromptItem = (prompt: PromptType, isPersonal: boolean) => (
    <MenuItem
      key={prompt.id}
      data-testid="pick-prompt-button"
      selected={prompt.id === activePrompt?.id}
      onClick={() => handleSelect(prompt)}
      sx={{ borderRadius: '1.25rem', display: 'flex', alignItems: 'center', gap: 1 }}
    >
      <Box sx={{ flexGrow: 1 }}>{prompt.name}</Box>

      {!isPersonal && (
        <>
          {prompt.hidden ? (

            <Tooltip title={t('hiddenPromptInfo')}>
              <VisibilityOff />
            </Tooltip>
          ) : (
            <Tooltip title={t('visiblePromptInfo')}>
              <Visibility
              />
            </Tooltip>
          )}
          <Link
            component={RouterLink}
            to={`/${courseId}?promptId=${prompt.id}`}
            variant="caption"
            onClick={(e) => e.stopPropagation()}
          >
            {t('course:directPromptLink', { name: prompt.name })}
          </Link>

          <IconButton
            size="small"
            onClick={(e) => handleCopyLink(e, prompt.id)}
            aria-label={t('common:copy')}
          >
            <ContentCopyOutlined fontSize="small" />
          </IconButton>
        </>
      )}

      <TextButton
        onClick={(e) => handleEdit(e, prompt)}
        color="primary"
        data-testid={`edit-prompt-${prompt.name}`}
        aria-label={t('common:edit')}
      >
        {t('common:edit')}
      </TextButton>

      <IconButton
        onClick={(event) => handleDelete(event, prompt)}
        size="small"
        aria-label={t('common:delete')}
        data-testid={`delete-prompt-${prompt.name}`}
      >
        <DeleteOutline fontSize="small" />
      </IconButton>
    </MenuItem>
  )

  const renderPromptList = (prompts: PromptType[], isPersonal: boolean) => (
    <Box>
      {prompts.length > 0 && (
        <Box>
          {prompts.map((prompt) => renderPromptItem(prompt, isPersonal))}
        </Box>
      )}
    </Box>
  )

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
      >
        {courseId !== 'general' && <Tab label={t('settings:coursePrompts')} disabled={createNewOpen} />}
        <Tab label={t('settings:myPrompts')} disabled={createNewOpen} />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {!createNewOpen && canCreatePrompt && (
          <>
            <OutlineButtonBlack
              data-testid="create-prompt-button"
              sx={{ mb: 2 }}
              onClick={handleCreateNew}
            >
              {t('settings:saveNewPrompt')}
            </OutlineButtonBlack>
            <MenuItem
              selected={activePrompt === undefined}
              sx={{ borderRadius: '1.25rem' }}
              onClick={() => handleSelect(undefined)}
            >
              {t('settings:noPrompt')}
            </MenuItem>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {courseId !== 'general' && tab === 0 && (
          <>
            {createNewOpen && (
              <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} />
            )}
            {!createNewOpen && renderPromptList(coursePrompts, false)}
          </>
        )}

        {(courseId === 'general' || tab === 1) && (
          <>
            {createNewOpen && (
              <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} personal />
            )}
            {!createNewOpen && renderPromptList(myPrompts, true)}
          </>
        )}

        {myPrompts.length === 0 && coursePrompts.length === 0 && !createNewOpen && (
          <MenuItem disabled>{t('settings:noPrompts')}</MenuItem>
        )}
      </Box>
    </Box>
  )
}

export default PromptModal
