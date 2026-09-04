import type { Theme } from '@mui/material'
import type { SystemStyleObject } from '@mui/system'
import { focusIndicator } from '../theme'

export const focusIndicatorStyle = ({ color }: { color?: string } = {}): SystemStyleObject<Theme> => ({
  '&.Mui-focusVisible': {
    outline: '3px solid',
    outlineColor: color ?? focusIndicator,
    outlineOffset: '-3px',
    backgroundColor: 'transparent',
  },
})

export const optionFocusIndicatorStyle = ({ color }: { color?: string } = {}): SystemStyleObject<Theme> => ({
  display: 'inline-flex',
  maxWidth: 'fit-content',
  alignItems: 'center',
  borderRadius: 1,
  '&:has(:focus-visible)': {
    outline: '3px solid',
    outlineColor: (theme) => color ?? theme.palette.primary.main,
    outlineOffset: '3px',
  },
})

export const switchFocusIndicatorStyle: SystemStyleObject<Theme> = {
  '& .MuiSwitch-switchBase.Mui-focusVisible .MuiSwitch-thumb': {
    outline: '3px solid',
    outlineColor: focusIndicator,
    outlineOffset: '2px',
  },
}
