import { Box, IconButton, TextField, Tooltip } from '@mui/material'
import { t } from 'i18next'
import { monospaceStyle } from '../../theme'
import CancelIcon from '@mui/icons-material/Cancel'
import DoneIcon from '@mui/icons-material/Done'

type OpenableTextfieldProps = {
  value: string
  onChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
  placeholder?: string
  testId?: string
}

const OpenableTextfield = ({
  value,
  onChange,
  onCancel,
  onSave,
  placeholder = '',
  testId = '',
}: OpenableTextfieldProps) => {
  return (
    <Box>
      <TextField
        variant="filled"
        sx={{ '& textarea': monospaceStyle }}
        slotProps={{
          htmlInput: {
            'data-testid': testId,
          },
        }}
        fullWidth
        multiline
        minRows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
        <Tooltip arrow placement='top' title={t('common:cancel')}>
          <IconButton size="small" onClick={onCancel}>
            <CancelIcon fontSize="small" color="primary" />
          </IconButton>
        </Tooltip>
        <Tooltip arrow placement='top' title={t('common:save')}>
          <IconButton size="small" onClick={onSave}>
          <DoneIcon fontSize="small" color="primary" />
          </IconButton>
        </Tooltip>  
      </Box>
    </Box>
  )
}


export default OpenableTextfield
