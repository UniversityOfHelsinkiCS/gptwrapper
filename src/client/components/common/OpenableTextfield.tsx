import { Box, TextField, type TextFieldProps } from '@mui/material'
import { GrayButton } from '../ChatV2/general/Buttons'
import AddIcon from '@mui/icons-material/Add'
import { t } from 'i18next'

type OpenableTextfieldProps = TextFieldProps & {
  onAppend: (text: string) => void
}

const OpenableTextfield = ({ onAppend, ...props }: OpenableTextfieldProps) => {
  return (
    <Box sx={{ mb: 2 }}>
      <TextField sx={{ mb: 0 }} {...props} fullWidth />
      <Box sx={{ display: 'flex', gap: 1, mt: 1, width: '100%' }}>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t('prompt:defaultRagMessage'))}>
          {t('prompt:defaultRagLabel')}
        </GrayButton>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t('prompt:enforceRagMessage'))}>
          {t('prompt:enforceRagLabel')}
        </GrayButton>
        <GrayButton size="small" endIcon={<AddIcon />} onClick={() => onAppend(t('prompt:unknownRagMessage'))}>
          {t('prompt:unknownRagLabel')}
        </GrayButton>
      </Box>
    </Box>
  )
}

export default OpenableTextfield
