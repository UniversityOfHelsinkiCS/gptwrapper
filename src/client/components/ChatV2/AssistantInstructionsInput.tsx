import { TextField, Typography } from '@mui/material'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useEffect } from 'react'
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
  instructions,
  instructionsInputFieldRef,
}: {
  label: string
  disabled: boolean
  hidden: boolean
  instructions: string
  instructionsInputFieldRef: React.RefObject<HTMLInputElement>
}): JSX.Element {
  useEffect(() => {
    if (instructionsInputFieldRef.current) {
      instructionsInputFieldRef.current.value = instructions
    }
  }, [instructions, instructionsInputFieldRef.current])
  return hidden ? (
    <TextField disabled={true} label={<VisibilityOff />} />
  ) : (
    <TextField
      inputRef={instructionsInputFieldRef}
      data-sentry-mask
      multiline
      minRows={6}
      maxRows={10}
      disabled={disabled}
      hidden={hidden}
      label={label}
      defaultValue={instructions}
    />
  )
}
