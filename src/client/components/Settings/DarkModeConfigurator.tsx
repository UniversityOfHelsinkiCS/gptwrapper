import { FormControlLabel, Switch } from "@mui/material"
import { useDarkMode } from "../../contexts/DarkModeContext"

export const DarkModeConfigurator = ({ label }: { label: string }) => {
  const { darkMode, setDarkMode } = useDarkMode()

  return (
    <FormControlLabel control={<Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />} label={label} />
  )
}
