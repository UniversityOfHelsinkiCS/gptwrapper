import { useTranslation } from 'react-i18next'
import { MenuItem, FormControl, Select, SelectChangeEvent, Typography } from '@mui/material'
import { FREE_MODEL } from '../../../config'

const ModelSelector = ({
  currentModel,
  setModel,
  availableModels,
  isTokenLimitExceeded,
}: {
  currentModel: string
  setModel: (model: string) => void
  availableModels: string[]
  isTokenLimitExceeded: boolean
}) => {
  const { t } = useTranslation()

  const validModel = availableModels.includes(currentModel) ? currentModel : ''

  return (
    <FormControl sx={{ minWidth: 100, opacity: 0.7 }} size="small">
      <Select
        sx={{
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        }}
        id="model-selector"
        value={validModel}
        onChange={(event: SelectChangeEvent) => setModel(event.target.value)}
      >
        {availableModels.map((model) => (
          <MenuItem key={model} value={model} disabled={isTokenLimitExceeded && model !== FREE_MODEL}>
            <Typography>
              {model}
              {model === FREE_MODEL && (
                <Typography component="span" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                  {' '}
                  ({t('chat:freeModel')})
                </Typography>
              )}
              {isTokenLimitExceeded && model !== FREE_MODEL && (
                <Typography component="span" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                  {' '}
                  ({t('chat:modelDisabled')})
                </Typography>
              )}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default ModelSelector
