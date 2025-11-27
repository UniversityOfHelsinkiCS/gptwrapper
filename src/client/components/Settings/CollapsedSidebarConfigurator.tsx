import { FormControlLabel, Switch } from "@mui/material"

export const CollapsedSidebarConfigurator = ({ label, value, setValue }: { label: string, value: boolean, setValue: (value: boolean) => void, context?: 'chat' | 'settings' }) => {
  return (
    <FormControlLabel control={<Switch checked={value} onChange={(e) => setValue(e.target.checked)} />} label={label} />
  )
}