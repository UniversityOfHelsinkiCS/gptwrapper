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
import { FREE_MODEL } from '../../../config'

const ModelSelector = ({
  currentModel,
  setModel,
  models,
}: {
  currentModel: string
  setModel: (model: string) => void
  models: string[]
}) => {
  const { t } = useTranslation()

  if (models.length === 1) {
    return (
      <Box style={{ marginBottom: 5 }}>
        <Typography variant="body1">
          {t('status:modelInUse')} <code>{models[0]}</code>
        </Typography>
      </Box>
    )
  }

  console.log('model', currentModel)
  console.log('models', models)

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '200px' }}>
        <span style={{ color: 'white' }}>{currentModel}</span>
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
  models,
  usage,
  limit,
}: {
  model: string
  setModel: (model: string) => void
  models: string[]
  usage: number
  limit: number
}) => {
  const { t } = useTranslation()

  const tokensUsed = usage > limit

  const style = tokensUsed ? { color: 'red' } : {}

  const acualModels = tokensUsed ? [FREE_MODEL] : models

  return (
    <Box>
      <ModelSelector
        currentModel={model}
        setModel={setModel}
        models={acualModels}
      />

      <Typography variant="body1" style={style}>
        {usage} / {limit} {t('status:tokensUsed')}
        {tokensUsed ? t('status:limitedUsage') : ''}
      </Typography>
    </Box>
  )
}

export default Status
