import { useEffect, useState } from 'react'
import { Box, InputLabel, MenuItem, FormControl, Select, SelectChangeEvent } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { Prompt } from '../../types'

const PromptSelector = ({ prompts, activePrompt, setActivePrompt }: { prompts: Prompt[]; activePrompt: string; setActivePrompt: (promptId: string) => void }) => {
  const { t } = useTranslation()
  const [mandatoryPrompt, setMandatoryPrompt] = useState<Prompt>()

  useEffect(() => {
    const mandatory = prompts.find((prompt) => prompt.mandatory)

    if (mandatory) {
      setActivePrompt(mandatory.id)
      setMandatoryPrompt(mandatory)
    }
  }, [])

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '40%' }}>
        <InputLabel>{t('prompt')}</InputLabel>
        {mandatoryPrompt ? (
          <Select disabled label={t('prompt')} value={activePrompt}>
            <MenuItem value={mandatoryPrompt.id}>{mandatoryPrompt.name}</MenuItem>
          </Select>
        ) : (
          <Select label={t('prompt')} value={activePrompt} onChange={(event: SelectChangeEvent) => setActivePrompt(event.target.value)}>
            <MenuItem value="">
              <em>{t('prompt')}</em>
            </MenuItem>
            {prompts.map((prompt) => (
              <MenuItem key={prompt.id} value={prompt.id}>
                {prompt.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </FormControl>
    </Box>
  )
}

export default PromptSelector
