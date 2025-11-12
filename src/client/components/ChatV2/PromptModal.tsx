import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, IconButton, MenuItem, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt as PromptType } from '../../types'
import { OutlineButtonBlack } from './general/Buttons'
import { usePromptState } from './PromptState'
import { PromptEditor } from '../Prompt/PromptEditor'
import { enqueueSnackbar } from 'notistack'
import { useParams } from 'react-router-dom'
import Prompt from '../Courses/Course/Prompt'
import useCurrentUser from '../../hooks/useCurrentUser'
import useCourse from '../../hooks/useCourse'

const PromptModal = () => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, deletePromptMutation } = usePromptState()
  const { courseId } = useParams()
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [tab, setTab] = useState(0)

  const { user } = useCurrentUser()
  const { data: chatInstance } = useCourse(courseId)

  const handleSelect = (prompt?: PromptType) => {
    handleChangePrompt(prompt)
  }

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>, prompt: PromptType) => {
    event.stopPropagation()
    try {
      if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) await deletePromptMutation(prompt.id)
      enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, { variant: 'success' })
    } catch (error) {

      enqueueSnackbar(`Error: ${error}`, { variant: 'error' })
    }
  }

  const amongResponsibles = chatInstance?.responsibilities ? chatInstance.responsibilities.some((r) => r.user.id === user?.id) : false

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
      >
        {courseId !== 'general' && <Tab label="kurssi alustukset" disabled={createNewOpen} />}
        <Tab label="omat alustukset" disabled={createNewOpen} />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {!createNewOpen && (courseId === 'general' || tab == 1 || amongResponsibles) && (
          <>
            <OutlineButtonBlack data-testid="create-prompt-button" sx={{ mb: 2 }} onClick={() => { setCreateNewOpen((prev) => !prev); handleChangePrompt(undefined) }}>
              {'Luo uusi alustus'}
            </OutlineButtonBlack>
            <MenuItem sx={{ borderRadius: '1.25rem' }} onClick={() => handleSelect(undefined)}>
              {t('settings:noPrompt')}
            </MenuItem>
            <Divider sx={{ my: 1 }} />
          </>
        )}
        {(courseId !== 'general' && tab === 0) && (
          <Box>
            {createNewOpen && (
              <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} />
            )}
            {!createNewOpen && coursePrompts.length > 0 && (
              <Box>
                {coursePrompts.map((prompt) =>
                (amongResponsibles ?
                  <Prompt prompt={prompt} /> :
                  <MenuItem
                    key={
                      prompt.id
                    }
                    selected={prompt.id === activePrompt?.id}
                    onClick={() => handleSelect(prompt)}
                    sx={{ borderRadius: '1.25rem' }}
                  >
                    {prompt.name}
                  </MenuItem>))}
              </Box>
            )}
          </Box>
        )}

        {(courseId === 'general' || tab === 1) && (
          <Box>
            {createNewOpen && (
              <PromptEditor back={`/${courseId}/prompts`} setEditorOpen={setCreateNewOpen} personal />
            )}
            {!createNewOpen && myPrompts.length > 0 && (
              <Box>
                {myPrompts.map((prompt) => (
                  <MenuItem
                    key={prompt.id}
                    selected={prompt.id === activePrompt?.id}
                    onClick={() => handleSelect(prompt)}
                    sx={{ borderRadius: '1.25rem' }}
                  >
                    {prompt.name}

                    <IconButton
                      onClick={(event) => handleDelete(event, prompt)}
                      size="small"
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </MenuItem>
                ))}
              </Box>
            )}

          </Box>
        )}
      </Box>
      {myPrompts.length === 0 && coursePrompts.length === 0 && (
        <MenuItem disabled>{t('settings:noPrompts')}</MenuItem>
      )}
    </Box >
  )
}

export default PromptModal
