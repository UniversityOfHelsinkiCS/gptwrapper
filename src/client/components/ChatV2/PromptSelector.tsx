import { DeleteOutline, KeyboardArrowDown, Lock } from '@mui/icons-material'
import { Box, Button, Divider, IconButton, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '../../types'

const PromptSelector = ({
  coursePrompts,
  myPrompts,
  activePrompt,
  setActivePrompt,
  handleDeletePrompt,
  mandatoryPrompt,
}: {
  coursePrompts: Prompt[]
  myPrompts: Prompt[]
  activePrompt?: Prompt
  setActivePrompt: (prompt: Prompt | undefined) => void
  handleDeletePrompt: (prompt: Prompt) => void
  mandatoryPrompt?: Prompt
  urlPrompt?: Prompt
}) => {
  const { t } = useTranslation()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleSelect = (prompt?: Prompt) => {
    setActivePrompt(prompt)
    setAnchorEl(null)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => {
    event.stopPropagation()
    if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) handleDeletePrompt(prompt)
  }

  return (
    <Box mb={'0.5rem'}>
      <Button
        disabled={!!mandatoryPrompt}
        variant="outlined"
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
        }}
        endIcon={mandatoryPrompt ? <Lock /> : <KeyboardArrowDown />}
      >
        {activePrompt?.name ?? t('settings:choosePrompt')}
        {!!mandatoryPrompt && ` - ${t('settings:promptLocked')}`}
      </Button>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleSelect(undefined)}>{t('settings:default')}</MenuItem>
        {coursePrompts.length > 0 && (
          <>
            <Divider />
            <ListSubheader>{t('settings:coursePrompts')}</ListSubheader>
            {coursePrompts.map((prompt) => (
              <MenuItem key={prompt.id} selected={prompt.id === activePrompt?.id} onClick={() => handleSelect(prompt)}>
                {prompt.name}
              </MenuItem>
            ))}
          </>
        )}
        {myPrompts.length > 0 && (
          <>
            <Divider />
            <ListSubheader>{t('settings:myPrompts')}</ListSubheader>
            {myPrompts.map((prompt) => (
              <MenuItem key={prompt.id} selected={prompt.id === activePrompt?.id} onClick={() => handleSelect(prompt)}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {prompt.name}
                  <IconButton onClick={(event) => handleDelete(event, prompt)} size="small" sx={{ ml: 'auto' }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Box>
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </Box>
  )
}

export default PromptSelector
