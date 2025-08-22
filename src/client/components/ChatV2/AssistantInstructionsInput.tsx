import { TextField, Typography } from '@mui/material'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useTranslation } from 'react-i18next'

const VisibilityOff = () => {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Typography variant="body1" color="textSecondary" style={{ marginRight: 8 }}>
        {t('chatV2.hiddenInstructions')}
      </Typography>
      <VisibilityOffIcon fontSize="small" />
    </div>
  )
}

export default function AssistantInstructionsInput({
  label,
  disabled,
  hidden,
  systemMessage,
  setSystemMessage,
}: {
  label: string
  disabled: boolean
  hidden: boolean
  systemMessage: string
  setSystemMessage: (message: string) => void
}): JSX.Element {
  return hidden ? (
    <TextField disabled={true} label={<VisibilityOff />} />
  ) : (
    <TextField
      data-sentry-mask
      multiline
      minRows={6}
      maxRows={10}
      disabled={disabled}
      hidden={hidden}
      label={label}
      value={systemMessage}
      onChange={(event) => setSystemMessage(event.target.value)}
    />
  )
}
