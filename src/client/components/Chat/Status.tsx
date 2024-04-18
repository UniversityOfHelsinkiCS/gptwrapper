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

const ModelText = ({ model }: { model: string }) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Typography variant="body1">
        {t('status:modelInUse')} <code>{model}</code>
      </Typography>
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

  return (
    <Box>
      {models.length > 1 ? (
        <ModelSelector
          currentModel={model}
          setModel={setModel}
          models={models}
        />
      ) : (
        <ModelText model={model} />
      )}

      <Typography variant="body1">
        {usage} / {limit} {t('status:tokensUsed')}
      </Typography>
    </Box>
  )
}

export default Status
