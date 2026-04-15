import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles'
import { useMemo } from 'react'
import { useMediaQuery } from '@mui/material'

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

const baseOptions: Omit<ThemeOptions, 'palette'> = {
  typography: {
    fontFamily: ['"Open Sans"', '"Helvetica"', '"Arial"', '"sans-serif"', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'].join(','),
  },

  shape: {
    borderRadius: 6,
  },

  components: {
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
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 5,
        },
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

// Feature flag: set to true to enable dark mode, false to force light mode
const DARK_MODE_ENABLED = false

const useTheme = () => {
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const prefersDarkMode = DARK_MODE_ENABLED && systemPrefersDark

  const theme = useMemo(
    () =>
      responsiveFontSizes(
        createTheme({
          ...baseOptions,
          palette: {
            mode: prefersDarkMode ? 'dark' : 'light',
            primary: {
              main: '#5779A2',
            },
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
              : { default: '#f4f4f4', subtle: '#efefef', paper: '#f8f8f8', elevated: '#ffffff' },
          },
        }),
      ),
    [prefersDarkMode],
  )

  return theme
}

export default useTheme
