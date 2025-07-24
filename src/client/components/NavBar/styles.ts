import { SxProps, Theme } from '@mui/material/styles'

const styles: { [key: string]: SxProps<Theme> } = {
  appbar: {
    backgroundColor: 'white',
    // The world is not yet ready for this:
    // background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.5) 100%)',
    // 'backdrop-filter': 'blur(10px)',
    // '-webkit-backdrop-filter': 'blur(10px)',
    // 'box-shadow': `
    //     /* Short subsurface effect */
    //     inset 0px 0px 10px 5px rgba(255, 255, 255, 0.025);
    //     /* Long subsurface effect */
    //     inset 0px 0px 40px 5px rgba(255, 255, 255, 0.025);`,
    borderBottom: '1px solid',
    borderColor: (theme: Theme) => theme.palette.divider,
  },
  toolbar: {
    display: 'flex',
    width: '100%',
    '@media print': {
      display: 'none',
    },
    justifyContent: 'space-between',
  },
  appName: {
    textTransform: 'uppercase',
    fontWeight: 700,
    fontSize: '1.4rem',
    mt: '0.2rem',
    userSelect: 'none',
  },
  navBox: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'inherit',
    textDecoration: 'none',
    marginRight: 1,
    fontWeight: (theme: Theme) => theme.typography.fontWeightMedium,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    transition: 'background-color 0.1s',
    borderRadius: 3,
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },
  },
  icon: { mr: 1, fontSize: '1rem' },
  language: { mr: 1 },
  item: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  activeItem: {
    color: (theme: Theme) => theme.palette.primary.main,
    fontWeight: (theme: Theme) => theme.typography.fontWeightMedium,
  },
}

export default styles
