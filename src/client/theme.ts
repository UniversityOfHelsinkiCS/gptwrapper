import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles'
import { useMemo } from 'react'
import { useDarkMode } from './contexts/DarkModeContext'

/**
 * Module augmentation to extend default theme with new colours: https://mui.com/material-ui/customization/palette/#customization
 */
declare module '@mui/material/styles' {
  interface Palette {
    toskaDark: Palette['primary']
    toskaPrimary: Palette['primary']
  }

  interface PaletteOptions {
    toskaDark: PaletteOptions['primary']
    toskaPrimary: PaletteOptions['primary']
  }

  interface TypeBackground {
    subtle: string
    elevated: string
  }
}

export const monospaceFonts = "'Fira Code', 'Cascadia Code', 'Consolas', 'Monaco', 'Courier New', monospace"
export const monospaceStyle = { fontFamily: monospaceFonts, fontSize: 'inherit' } as const

export const focusIndicatorColors = { light: '#005fcc', dark: '#66b2ff' } as const

export const focusIndicator = `var(--focus-indicator, ${focusIndicatorColors.light})`
export const focusVisibleOutline = {
  outline: `3px solid ${focusIndicator}`,
  outlineOffset: '2px',
} as const

const resetFocusVisibleBackground = {
  '&.Mui-focusVisible': {
    backgroundColor: 'transparent',
  },
} as const

const baseOptions: Omit<ThemeOptions, 'palette'> = {
  typography: {
    fontFamily: ['"Open Sans"', '"Helvetica"', '"Arial"', '"sans-serif"', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'].join(','),
    overline: {
      fontSize: '0.75rem',
    },
  },

  shape: {
    borderRadius: 6,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': focusVisibleOutline,
      },
    },

    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },

      styleOverrides: {
        root: {
          '&:focus-visible': focusVisibleOutline,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 3,
        },
        outlined: {
          borderWidth: '2px',
          ':hover': {
            borderWidth: '2px',
          },
        },
        outlinedPrimary: ({ theme }) =>
          theme.applyStyles('dark', {
            color: theme.palette.text.primary,
            borderColor: theme.palette.primary.light,
          }),
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 5,
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: ({ theme }) => theme.applyStyles('dark', { backgroundColor: theme.palette.text.primary }),
      },
    },

    MuiTab: {
      styleOverrides: {
        textColorPrimary: ({ theme }) => theme.applyStyles('dark', { '&.Mui-selected': { color: theme.palette.text.primary } }),
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: resetFocusVisibleBackground,
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: resetFocusVisibleBackground,
      },
    },

    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(87, 121, 162, 0.08)',
          ':hover': {
            backgroundColor: 'rgba(87, 121, 162, 0.13)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(87, 121, 162, 0.13)',
          },
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.875rem',
          fontWeight: 400,
          lineHeight: 1.43,
          padding: '8px',
        },
      },
    },
  },
}

const useTheme = () => {
  const { darkMode: prefersDarkMode } = useDarkMode()

  const theme = useMemo(
    () =>
      responsiveFontSizes(
        createTheme({
          ...baseOptions,
          palette: {
            mode: prefersDarkMode ? 'dark' : 'light',
            primary: {
              main: '#54749C',
            },
            secondary: {
              main: '#79719D',
            },
            success: prefersDarkMode ? { main: '#81c784', dark: '#4a7c59' } : { main: '#4a7c59' },
            info: prefersDarkMode ? { main: '#90a9cb', dark: '#5779A2' } : { main: '#5779A2' },
            warning: {
              main: '#aa4308',
            },
            error: prefersDarkMode ? { main: '#e57373', dark: '#9b4545' } : { main: '#9b4545' },
            toskaDark: {
              main: '#1a202c',
              contrastText: '#fff',
            },
            toskaPrimary: {
              main: '#e99939',
              contrastText: '#1a202c',
            },
            background: prefersDarkMode
              ? { default: '#121212', subtle: '#181818', paper: '#1e1e1e', elevated: '#252525' }
              : { default: '#f4f4f4', subtle: 'rgba(87, 121, 162, 0.08)', paper: '#f8f8f8', elevated: '#ffffff' },
          },
        }),
      ),
    [prefersDarkMode],
  )

  return theme
}

export default useTheme
