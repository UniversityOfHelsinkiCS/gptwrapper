import { useEffect, useState } from 'react'
import { Box, InputLabel, MenuItem, FormControl, Select, SelectChangeEvent, Divider, ListSubheader, Menu, Button, IconButton } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Prompt } from '../../types'
import { DeleteOutline, KeyboardArrowDown } from '@mui/icons-material'

const PromptSelector = ({
  coursePrompts,
  myPrompts,
  activePrompt,
  setActivePrompt,
  handleDeletePrompt,
}: {
  coursePrompts: Prompt[]
  myPrompts: Prompt[]
  activePrompt?: Prompt
  setActivePrompt: (prompt: Prompt | undefined) => void
  handleDeletePrompt: (prompt: Prompt) => void
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
    <Box mb={2} sx={{ flex: 1 }}>
      <Button
        variant="outlined"
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
        }}
        endIcon={<KeyboardArrowDown />}
      >
        {activePrompt?.name ?? t('settings:choosePrompt')}
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
