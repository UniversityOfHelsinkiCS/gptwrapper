import { FormControlLabel, Switch } from '@mui/material'
import { useDarkMode } from '../../contexts/DarkModeContext'
import { switchFocusIndicatorStyle } from 'src/client/util/accessibility'

export const DarkModeConfigurator = ({ label }: { label: string }) => {
  const { darkMode, setDarkMode } = useDarkMode()

  return (
    <FormControlLabel
      control={<Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} sx={{ ...switchFocusIndicatorStyle }} />}
      label={label}
    />
  )
}
