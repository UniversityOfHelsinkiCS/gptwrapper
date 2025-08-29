import { DeleteOutline, KeyboardArrowDown, Lock, AutoAwesome } from '@mui/icons-material'
import { Box, Divider, IconButton, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '../../types'
import { OutlineButtonBlack } from './general/Buttons'

const PromptSelector = ({
  sx = {},
  coursePrompts,
  myPrompts,
  activePrompt,
  setActivePrompt,
  handleDeletePrompt,
  mandatoryPrompt,
}: {
  sx?: object
  coursePrompts: Prompt[]
  myPrompts: Prompt[]
  activePrompt?: Prompt
  setActivePrompt: (prompt: Prompt | undefined) => void
  handleDeletePrompt?: ((prompt: Prompt) => void)
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
    if (handleDeletePrompt)
      if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) handleDeletePrompt(prompt)
  }

  return (
    <Box sx={{ marginBottom: '0.5rem' }}>
      <OutlineButtonBlack
        sx={sx}
        startIcon={<AutoAwesome />}
        data-testid="prompt-selector-button"
        disabled={!!mandatoryPrompt}
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
        }}
        endIcon={mandatoryPrompt ? <Lock /> : <KeyboardArrowDown />}
      >
        {activePrompt?.name ?? t('settings:choosePrompt')}
        {!!mandatoryPrompt && ` - ${t('settings:promptLocked')}`}
      </OutlineButtonBlack>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            style: {
              minWidth: anchorEl?.offsetWidth || 200,
            },
          },
        }}>
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
                  {handleDeletePrompt &&
                    <IconButton onClick={(event) => handleDelete(event, prompt)} size="small" sx={{ ml: 'auto' }}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  }
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
