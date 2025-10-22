import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { Box, Divider, IconButton, ListSubheader, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Course, Prompt } from '../../types'
import { OutlineButtonBlack } from './general/Buttons'
import { usePromptState } from './PromptState'
import { PromptEditor } from '../Prompt/PromptEditor'
import { useCourseRagIndices } from '../../hooks/useRagIndices'

const PromptModal = ({ handleDeletePrompt, course }: { sx?: object; handleDeletePrompt?: (prompt: Prompt) => void, course?: Course }) => {
  const { activePrompt, handleChangePrompt, coursePrompts, myPrompts } = usePromptState()

  const { ragIndices } = useCourseRagIndices(course?.id)

  const { t } = useTranslation()

  const [createNewOpen, setCreateNewOpen] = useState(false)

  const handleSelect = (prompt?: Prompt) => {
    handleChangePrompt(prompt)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => {
    event.stopPropagation()
    if (handleDeletePrompt) if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) handleDeletePrompt(prompt)
  }

  return (
    <Box>
      <OutlineButtonBlack onClick={() => setCreateNewOpen(prev => !prev)}>{'Luo uusi kurssialustus'}</OutlineButtonBlack>
      {createNewOpen && <PromptEditor ragIndices={ragIndices} chatInstanceId={course?.id} type='CHAT_INSTANCE' setEditorOpen={setCreateNewOpen} />}
      <MenuItem sx={{ borderRadius: '1.25rem' }} onClick={() => handleSelect(undefined)}>{t('settings:emptyPrompt')}</MenuItem>
      {coursePrompts.length > 0 && (
        <div>
          <Divider />
          <ListSubheader>{t('settings:coursePrompts')}</ListSubheader>
          {coursePrompts.map((prompt) => (
            <MenuItem sx={{ borderRadius: '1.25rem' }}
              key={prompt.id}
              selected={prompt.id === activePrompt?.id}
              onClick={() => handleSelect(prompt)}
            >
              {prompt.name}
            </MenuItem>
          ))}
        </div>
      )}
      {myPrompts.length > 0 && (
        <div>
          <Divider />
          <ListSubheader>{t('settings:myPrompts')}</ListSubheader>
          {myPrompts.map((prompt) => (
            <MenuItem key={prompt.id} selected={prompt.id === activePrompt?.id} onClick={() => handleSelect(prompt)}>
              {prompt.name}
              {handleDeletePrompt && (
                <IconButton onClick={(event) => handleDelete(event, prompt)} size="small" sx={{ ml: 'auto' }}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              )}
            </MenuItem>
          ))}
        </div>
      )}
      {myPrompts.length === 0 && coursePrompts.length === 0 && <MenuItem disabled>{t('settings:noPrompts')}</MenuItem>}
    </Box>
  )
}

export default PromptModal
