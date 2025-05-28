import { useTranslation } from 'react-i18next'
import { Box, Typography, MenuItem, FormControl, Select, SelectChangeEvent, InputLabel } from '@mui/material'
import { FREE_MODEL } from '../../../config'
import ModelSelector from './ModelSelector'

const Status = ({ model, setModel, models, usage, limit }: { model: string; setModel: (model: string) => void; models: string[]; usage: number; limit: number }) => {
  const { t } = useTranslation()

  const tokensUsed = usage > limit

  const style = tokensUsed ? { color: 'red' } : {}

  const acualModels = tokensUsed ? [FREE_MODEL] : models

  return (
    <Box>
      <ModelSelector currentModel={model} setModel={setModel} models={acualModels} />

      <Typography variant="body1" style={style}>
        {usage} / {limit} {t('status:tokensUsed')}
        {tokensUsed ? t('status:limitedUsage') : ''}
      </Typography>
    </Box>
  )
}

export default Status
