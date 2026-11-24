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
          scrollPaddingTop: 'max(var(--floating-top, 0px), var(--snackbar-cover-top, 0px))',
          scrollPaddingBottom: 'max(var(--chatbox-height, 0px), var(--snackbar-cover-bottom, 0px))',
          [SHORT_VIEWPORT]: {
            scrollPaddingTop: 'var(--snackbar-cover-top, 0px)',
            scrollPaddingBottom: 'var(--snackbar-cover-bottom, 0px)',
          },
        },
        'html .notistack-SnackbarContainer': {
          top: '14px',
          right: '20px',
          left: 'auto',
          width: '400px',
          maxWidth: 'calc(100% - 40px)',
          transform: 'none',
          alignItems: 'stretch',
          [theme.breakpoints.down('md')]: {
            left: 'calc(var(--snackbar-left, 0px) + 16px)',
            right: '16px',
            top: 'max(var(--snackbar-top, 62px), calc(var(--back-button-bottom, 0px) - 2px))',
            width: 'auto',
            maxWidth: 'none',
          },
        },
        'html[data-snackbar-placement="bottom"] .notistack-SnackbarContainer': {
          top: 'auto',
          bottom: 'calc(var(--chatbox-height, 0px) + 16px)',
          [SHORT_VIEWPORT]: {
            bottom: '16px',
          },
        },
        'html .notistack-SnackbarContainer .notistack-Snackbar': {
          minWidth: 0,
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
