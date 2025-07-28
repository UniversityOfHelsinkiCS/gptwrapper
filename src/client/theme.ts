import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles'
import { useMemo } from 'react'

// import { useMediaQuery } from '@mui/material'

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
}

const themeOptions: ThemeOptions = {
  typography: {
    fontFamily: ['"Open Sans"', '"Helvetica"', '"Arial"', '"sans-serif"', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'].join(','),
  },

  palette: {
    // primary: {
    //   main: '#107eab',
    // },
    toskaDark: {
      main: '#1a202c',
      contrastText: '#fff',
    },
    toskaPrimary: {
      main: '#e99939',
      contrastText: '#1a202c',
    },
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

// const ColorModeContext = React.createContext({ toggleColorMode: () => {} });

const useTheme = () => {
  const prefersDarkMode = false // useMediaQuery('(prefers-color-scheme: dark)');
  if (themeOptions.palette) {
    themeOptions.palette.mode = prefersDarkMode ? 'dark' : 'light'
  }

  const theme = useMemo(() => responsiveFontSizes(createTheme(themeOptions)), [])

  return theme
}

export default useTheme
