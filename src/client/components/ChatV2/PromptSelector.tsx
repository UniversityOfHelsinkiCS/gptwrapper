import { useEffect, useState } from 'react'
import { Box, InputLabel, MenuItem, FormControl, Select, SelectChangeEvent, Divider, ListSubheader } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Prompt } from '../../types'

const PromptSelector = ({
  title,
  coursePrompts,
  myPrompts,
  activePrompt,
  setActivePrompt,
}: {
  title: string
  coursePrompts: Prompt[]
  myPrompts: Prompt[]
  activePrompt?: Prompt
  setActivePrompt: (prompt: Prompt | undefined) => void
}) => {
  const { t } = useTranslation()

  const allPrompts = [...coursePrompts, ...myPrompts]

  return (
    <Box mb={2} sx={{ flex: 1 }}>
      <FormControl fullWidth>
        <InputLabel>{title}</InputLabel>
        <Select
          label={title}
          value={activePrompt?.id ?? 'none'}
          onChange={(event: SelectChangeEvent) => {
            const newPrompt = allPrompts.find(({ id }) => id === event.target.value)
            if (newPrompt) {
              setActivePrompt(newPrompt)
            } else {
              setActivePrompt(undefined)
            }
          }}
        >
          <MenuItem value="">{t('settings:none')}</MenuItem>
          <Divider />
          <ListSubheader>{t('settings:coursePrompts')}</ListSubheader>
          {coursePrompts.map((prompt) => (
            <MenuItem key={prompt.id} value={prompt.id} selected={prompt.id === activePrompt?.id}>
              {prompt.name}
            </MenuItem>
          ))}
          <Divider />
          <ListSubheader>{t('settings:myPrompts')}</ListSubheader>
          {myPrompts.map((prompt) => (
            <MenuItem key={prompt.id} value={prompt.id} selected={prompt.id === activePrompt?.id}>
              {prompt.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default PromptSelector
