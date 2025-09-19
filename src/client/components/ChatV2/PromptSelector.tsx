import { DeleteOutline, KeyboardArrowDown, Lock, AutoAwesome } from '@mui/icons-material'
import { Box, Divider, IconButton, ListSubheader, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '../../types'
import { OutlineButtonBlack } from './general/Buttons'
import { usePromptState } from './PromptState'

const PromptSelector = ({ sx = {}, handleDeletePrompt }: { sx?: object; handleDeletePrompt?: (prompt: Prompt) => void }) => {
  const { activePrompt, handleChangePrompt, mandatoryPrompt, coursePrompts, myPrompts } = usePromptState()

  const { t } = useTranslation()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleSelect = (prompt?: Prompt) => {
    handleChangePrompt(prompt)
    setAnchorEl(null)
  }

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>, prompt: Prompt) => {
    event.stopPropagation()
    if (handleDeletePrompt) if (confirm(t('settings:confirmDeletePrompt', { name: prompt.name }))) handleDeletePrompt(prompt)
  }

  return (
    <Box>
      <OutlineButtonBlack
        sx={{ width: '100%' }}
        startIcon={<AutoAwesome />}
        data-testid={`prompt-selector-button`}
        disabled={!!mandatoryPrompt}
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
        }}
        endIcon={mandatoryPrompt ? <Lock /> : <KeyboardArrowDown />}
      >
        <Box sx={{
          overflow: 'hidden',
          width: { md: 140, lg: 160 },
          textOverflow: 'ellipsis',
        }}>
          {activePrompt?.name ?? t('settings:choosePrompt')}
        </Box>
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
        }}
      >
        <MenuItem onClick={() => handleSelect(undefined)}>{t('settings:emptyPrompt')}</MenuItem>
        {coursePrompts.length > 0 && (
          <div>
            <Divider />
            <ListSubheader>{t('settings:coursePrompts')}</ListSubheader>
            {coursePrompts.map((prompt) => (
              <MenuItem key={prompt.id} selected={prompt.id === activePrompt?.id} onClick={() => handleSelect(prompt)}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {prompt.name}
                  {handleDeletePrompt && (
                    <IconButton onClick={(event) => handleDelete(event, prompt)} size="small" sx={{ ml: 'auto' }}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </MenuItem>
            ))}
          </div>
        )}
        {myPrompts.length === 0 && coursePrompts.length === 0 && <MenuItem disabled>{t('settings:noPrompts')}</MenuItem>}
      </Menu>
    </Box>
  )
}

export default PromptSelector
