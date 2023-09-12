import React from 'react'
import {
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Prompt } from '../../types'

const PromptSelector = ({
  prompts,
  activePrompt,
  setActivePrompt,
}: {
  prompts: Prompt[]
  activePrompt: string
  setActivePrompt: (promptId: string) => void
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '40%' }}>
        <InputLabel>{t('prompt')}</InputLabel>
        <Select
          label={t('prompt')}
          value={activePrompt}
          onChange={(event: SelectChangeEvent) =>
            setActivePrompt(event.target.value)
          }
        >
          {prompts.map((prompt) => (
            <MenuItem key={prompt.id} value={prompt.id}>
              {prompt.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default PromptSelector
