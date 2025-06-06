import { useTranslation } from 'react-i18next'
import { Box, Typography, MenuItem, FormControl, Select, SelectChangeEvent, InputLabel } from '@mui/material'
import { FREE_MODEL } from '../../../config'

const ModelSelector = ({ currentModel, setModel, models }: { currentModel: string; setModel: (model: string) => void; models: string[] }) => {
  const { t } = useTranslation()

  // if (models.length === 1) {
  //   return (
  //     <Box style={{ marginBottom: 5 }}>
  //       <Typography variant="body1">
  //         {t('status:modelInUse')} <code>{models[0]}</code>
  //       </Typography>
  //     </Box>
  //   )
  // }

  return (
    <FormControl sx={{ minWidth: 100, opacity: 0.7 }} size="small">
      {/* <InputLabel>{t('status:modelInUse')}</InputLabel> */}
      <Select
        sx={{
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        }}
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
  )
}

export default ModelSelector
