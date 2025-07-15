import { useTranslation } from 'react-i18next'
import { MenuItem, FormControl, Select, SelectChangeEvent, Typography } from '@mui/material'
import { FREE_MODEL } from '../../../config';

const ModelSelector = ({ currentModel, setModel, availableModels }: { currentModel: string; setModel: (model: string) => void; availableModels: string[] }) => {
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
          <MenuItem key={model} value={model}>
            <Typography>
              {model}
              {model === FREE_MODEL && <Typography component='span' sx={{ fontStyle: 'italic', opacity: 0.8 }}> ({t("chat:freeModel")})</Typography>}
            </Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl >
  )
}

export default ModelSelector
