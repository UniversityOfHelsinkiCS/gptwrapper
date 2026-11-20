import { Chip, type SxProps, type Theme } from '@mui/material'
import { useTranslation } from 'react-i18next'

/** Tags My files as experimental, like the experimental tools in the prompt editor. */
export const ExperimentalChip = ({ sx }: { sx?: SxProps<Theme> }) => {
  const { t } = useTranslation()
  return (
    <Chip
      size="small"
      variant="outlined"
      color="error"
      label={t('prompt:toolExperimental')}
      sx={[{ ml: 1, cursor: 'inherit' }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  )
}
