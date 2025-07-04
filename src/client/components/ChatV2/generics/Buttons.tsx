import Button from '@mui/material/Button'
import { styled } from '@mui/material'

const commonStyles: React.CSSProperties = {
  color: 'rgba(0, 0, 0, 0.8)',
  textTransform: 'none',
  borderRadius: '20px',
  boxShadow: '0 1px 2px lightgray',
  fontSize: '16px',
  fontWeight: '600',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  padding: '.5rem 1rem',
  margin: '2px 0',
}

const additionalClasses = {
  '& .MuiButton-startIcon': {
    fontSize: '24px',
    marginLeft: 0,
    marginRight: 0,
    position: 'absolute',
    left: '1rem',
  },
  '& .MuiButton-startIcon > *:nth-of-type(1)': {
    fontSize: '24px',
  },
  '&:has(.MuiButton-startIcon)': {
    paddingLeft: '2.25rem',
  },
}

export const GrayButton = styled(Button)({
  ...commonStyles,
  ...additionalClasses,
  backgroundColor: '#efefef',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
})

export const BlueButton = styled(Button)({
  ...commonStyles,
  ...additionalClasses,
  backgroundColor: '#1976D2',
  color: 'white',
  '&:hover': {
    backgroundColor: '#1565C0',
  },
})

export const OutlineButtonBlack = styled(Button)({
  ...commonStyles,
  ...additionalClasses,
  backgroundColor: 'transparent',
  border: '1px solid #a5a5a5',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
})

export const OutlineButtonBlue = styled(Button)({
  ...commonStyles,
  ...additionalClasses,
  backgroundColor: 'transparent',
  border: '1px solid #1976D2',
  color: '#1976D2',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.05)',
  },
})
