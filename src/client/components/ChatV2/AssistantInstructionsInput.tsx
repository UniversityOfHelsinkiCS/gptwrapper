import { TextField, Typography } from '@mui/material'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

const VisibilityOff = () => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <Typography variant="body1" color="textSecondary" style={{ marginRight: 8 }}>
      Tämä alustus on piilotettu
    </Typography>
    <VisibilityOffIcon fontSize="small" />
  </div>
)

export default function AssistantInstructionsInput({
  disabled,
  hidden,
  instructions,
  setInstructions,
}: {
  disabled: boolean
  hidden: boolean
  instructions: string
  setInstructions: (instructions: string) => void
}): JSX.Element {
  return hidden ? (
    <TextField disabled={true} label={<VisibilityOff />} />
  ) : (
    <TextField
      multiline
      minRows={6}
      maxRows={10}
      disabled={disabled}
      hidden={hidden}
      label="Alustuksen sisältö"
      value={instructions}
      onChange={(e) => setInstructions(e.target.value)}
    />
  )
}
