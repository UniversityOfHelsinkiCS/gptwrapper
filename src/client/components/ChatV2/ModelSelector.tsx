import { useTranslation } from 'react-i18next'
import { MenuItem, FormControl, Select, SelectChangeEvent } from '@mui/material'

const ModelSelector = ({ currentModel, setModel, availableModels }: { currentModel: string; setModel: (model: string) => void; availableModels: string[] }) => {
  const { t } = useTranslation()

  return (
    <FormControl sx={{ minWidth: 100, opacity: 0.7 }} size="small">
      <Select
        sx={{
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        }}
        value={currentModel}
        onChange={(event: SelectChangeEvent) => setModel(event.target.value)}
      >
        {availableModels.map((model) => (
          <MenuItem key={model} value={model}>
            {model}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default ModelSelector
