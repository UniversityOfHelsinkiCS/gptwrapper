import { Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'

/** Tags My files as experimental, like the experimental tools in the prompt editor. */
export const ExperimentalChip = () => {
  const { t } = useTranslation()
  return <Chip size="small" variant="outlined" color="error" label={t('prompt:toolExperimental')} sx={{ ml: 1, cursor: 'inherit' }} />
}
