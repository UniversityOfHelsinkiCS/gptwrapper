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

const OpenableTextfield = ({ value, onChange, onCancel, onSave, placeholder = '', testId = '' }: OpenableTextfieldProps) => {
  return (
    <Box>
      <TextField
        id={testId}
        variant="filled"
        sx={{ '& textarea': monospaceStyle }}
        slotProps={{
          htmlInput: {
            'data-testid': testId,
            'aria-label': placeholder || undefined,
          },
        }}
        fullWidth
        multiline
        minRows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1, mr: 1 }}>
        <Tooltip arrow placement="top" title={t('common:cancel')}>
          <IconButton
            size="small"
            onClick={onCancel}
            aria-label={placeholder ? t('accessibility:itemAction', { action: t('common:cancel'), item: placeholder }) : t('common:cancel')}
          >
            <CancelIcon fontSize="small" color="primary" />
          </IconButton>
        </Tooltip>
        <Tooltip arrow placement="top" title={t('common:save')}>
          <IconButton
            size="small"
            onClick={onSave}
            aria-label={placeholder ? t('accessibility:itemAction', { action: t('common:save'), item: placeholder }) : t('common:save')}
          >
            <DoneIcon fontSize="small" color="primary" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default OpenableTextfield
