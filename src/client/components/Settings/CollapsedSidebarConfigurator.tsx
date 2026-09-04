import { FormControlLabel, Switch } from '@mui/material'
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'

export const CollapsedSidebarConfigurator = ({
  label,
  value,
  setValue,
}: {
  label: string
  value: boolean
  setValue: (value: boolean) => void
  context?: 'chat' | 'settings'
}) => {
  return (
    <FormControlLabel control={<Switch checked={value} onChange={(e) => setValue(e.target.checked)} sx={{ ...switchFocusIndicatorStyle }} />} label={label} />
  )
}
