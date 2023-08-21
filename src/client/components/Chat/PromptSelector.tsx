import React from 'react'
import {
  Box,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
} from '@mui/material'

import { Prompt } from '../../types'

const PromptSelector = ({
  prompts,
  activePrompt,
  setActivePrompt,
}: {
  prompts: Prompt[]
  activePrompt: string
  setActivePrompt: (promptId: string) => void
}) => (
  <Box mb={2}>
    <FormControl sx={{ width: '33%' }}>
      <InputLabel>Prompt</InputLabel>
      <Select
        label="Prompt"
        value={activePrompt}
        onChange={(event: SelectChangeEvent) =>
          setActivePrompt(event.target.value)
        }
      >
        {prompts.map((prompt) => (
          <MenuItem key={prompt.id} value={prompt.id}>
            {prompt.systemMessage.slice(0, 20)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
)

export default PromptSelector
