import { useTranslation } from 'react-i18next'
import { Box, Typography, MenuItem, FormControl, Select, SelectChangeEvent, InputLabel } from '@mui/material'
import { FREE_MODEL } from '../../../config'

const ModelSelector = ({ currentModel, setModel, models }: { currentModel: string; setModel: (model: string) => void; models: string[] }) => {
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

  return (
    <Box mb={2}>
      <FormControl sx={{ width: '200px' }}>
        <InputLabel>{t('status:modelInUse')}</InputLabel>
        <Select label={t('status:modelInUse')} value={currentModel} onChange={(event: SelectChangeEvent) => setModel(event.target.value)}>
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

export default ModelSelector
