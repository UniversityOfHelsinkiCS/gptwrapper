import { GlobalStyles, useTheme } from '@mui/material'
import { SHORT_VIEWPORT, focusIndicatorColors } from './theme'

export default function Styles() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <GlobalStyles
      styles={{
        body: {
          '--sb-track-color': 'transparent',
          '--sb-thumb-color': isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
          '--sb-thumb-hover-color': isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
          '--sb-size': '6px',
          '--loader-color': theme.palette.text.primary,
          '--focus-indicator': focusIndicatorColors[theme.palette.mode],
          backgroundColor: theme.palette.background.default,
        },
        html: {
          scrollPaddingTop: 'var(--floating-top, 0px)',
          scrollPaddingBottom: 'var(--chatbox-height, 0px)',
          [SHORT_VIEWPORT]: {
            scrollPaddingTop: 0,
            scrollPaddingBottom: 0,
          },
        },
        '*::-webkit-scrollbar': {
          width: 'var(--sb-size)',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--sb-thumb-color)',
          borderRadius: 'var(--sb-size)',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'var(--sb-thumb-hover-color)',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'var(--sb-track-color)',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--sb-thumb-color) var(--sb-track-color)',
        },
      }}
    />
  )
}
