import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, IconButton, ListSubheader, MenuItem, Tab, Tabs } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Course, Prompt } from '../../types'
import { OutlineButtonBlack } from './general/Buttons'
import { usePromptState } from './PromptState'
import { PromptEditor } from '../Prompt/PromptEditor'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import usePrompts from '../../hooks/usePrompts'
import { enqueueSnackbar } from 'notistack'

const PromptModal = ({ chatInstanceId }: { chatInstanceId?: string }) => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts, createPromptMutation, editPromptMutation, deletePromptMutation } = usePromptState()

  const { ragIndices } = useCourseRagIndices(chatInstanceId)
  const { t } = useTranslation()
  const [createNewOpen, setCreateNewOpen] = useState(false)
  const [tab, setTab] = useState(0)

  const handleSelect = (prompt?: Prompt) => {
    handleChangePrompt(prompt)
  }

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => {
    event.stopPropagation()
    try {
      if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) await deletePromptMutation(prompt.id)
      enqueueSnackbar(`${t('common:delete')} ${prompt.name}`, { variant: 'success' })
    } catch (error) {

      enqueueSnackbar(`Error: ${error}`, { variant: 'error' })
    }
  }

  return (
    <Box>
      <Tabs
        sx={{ borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, newValue) => setTab(newValue)}
      >
        {!!chatInstanceId && <Tab label="kurssi alustukset" disabled={createNewOpen} />}
        <Tab label="omat alustukset" disabled={createNewOpen} />
      </Tabs>
      <Box sx={{ mt: 2 }}>
        {!createNewOpen && (
          <>
            <OutlineButtonBlack sx={{ mb: 2 }} onClick={() => setCreateNewOpen((prev) => !prev)}>
              {'Luo uusi alustus'}
            </OutlineButtonBlack>
            <MenuItem sx={{ borderRadius: '1.25rem' }} onClick={() => handleSelect(undefined)}>
              {t('settings:noPrompt')}
            </MenuItem>
            <Divider sx={{ my: 1 }} />
          </>
        )}
        {(!!chatInstanceId && tab === 0) && (
          <Box>
            {createNewOpen && (
              <PromptEditor
                ragIndices={ragIndices}
                chatInstanceId={chatInstanceId}
                type="CHAT_INSTANCE"
                setEditorOpen={setCreateNewOpen}
                createPromptMutation={createPromptMutation}
                editPromptMutation={editPromptMutation}
              />
            )}
            {!createNewOpen && coursePrompts.length > 0 && (
              <Box>
                {coursePrompts.map((prompt) => (
                  <MenuItem
                    sx={{ borderRadius: '1.25rem' }}
                    key={prompt.id}
                    selected={prompt.id === activePrompt?.id}
                    onClick={() => handleSelect(prompt)}
                  >
                    {prompt.name}
                  </MenuItem>
                ))}
              </Box>
            )}
          </Box>
        )}

        {(!chatInstanceId || tab === 1) && (
          <Box>
            {createNewOpen && (
              <PromptEditor
                ragIndices={ragIndices}
                type="PERSONAL"
                setEditorOpen={setCreateNewOpen}
                createPromptMutation={createPromptMutation}
                editPromptMutation={editPromptMutation}
              />
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

            {myPrompts.length === 0 && coursePrompts.length === 0 && (
              <MenuItem disabled>{t('settings:noPrompts')}</MenuItem>
            )}
          </Box>
        )}
      </Box>
    </Box >
  )
}

export default PromptModal
