import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  MenuItem,
  FormControl,
  Select,
  SelectChangeEvent,
  InputLabel,
} from '@mui/material'

import { validModels } from '../../../config'
import { Set } from '../../types'

const ModelSelector = ({
  currentModel,
  setModel,
}: {
  currentModel: string
  setModel: Set<string>
}) => {
  const { t } = useTranslation()

  const models = validModels.map(({ name }) => name)

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '200px' }}>
        <InputLabel>{t('status:modelInUse')}</InputLabel>
        <Select
          label={t('status:modelInUse')}
          value={currentModel}
          onChange={(event: SelectChangeEvent) => setModel(event.target.value)}
        >
          {models.map((model) => (
            <MenuItem key={model} value={model}>
              {model}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

const Status = ({
  model,
  setModel,
  usage,
  limit,
}: {
  model: string
  setModel: Set<string>
  usage: number
  limit: number
}) => {
  const { t } = useTranslation()

  return (
    <Box mb={1} padding="2% 10%">
      <ModelSelector currentModel={model} setModel={setModel} />

      <Typography variant="body1">
        {usage} / {limit} {t('status:tokensUsed')}
      </Typography>
    </Box>
  )
}

export default Status
