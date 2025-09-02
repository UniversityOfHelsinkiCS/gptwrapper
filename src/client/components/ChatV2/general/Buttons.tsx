import Button from '@mui/material/Button'
import { styled } from '@mui/material'

const BaseButton = styled(Button)({
  color: 'rgba(0, 0, 0, 0.8)',
  textTransform: 'none',
  borderRadius: '30px',
  boxShadow: '0 1px 2px lightgray',
  fontSize: '16px',
  height: 42,
  fontWeight: '600',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  padding: '.5rem 1rem',
  margin: '2px 0',
  whiteSpace: 'nowrap',
  minWidth: 'fit-content',
  '& .MuiButton-startIcon': {
    fontSize: '22px',
  },
  '& .MuiButton-startIcon > *:nth-of-type(1)': {
    fontSize: '22px',
  },
  '& .MuiButton-endIcon': {
    fontSize: '22px',
  },
  '&:has(.MuiButton-startIcon):has(.MuiButton-endIcon)': {
    justifyContent: 'space-between',
  },
  '&.Mui-disabled': {
    backgroundColor: '#e0e0e0',
    color: 'rgba(0, 0, 0, 0.3)',
    boxShadow: 'none',
  },
})

export const GrayButton = styled(BaseButton)({
  backgroundColor: '#efefef',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
})

export const BlueButton = styled(BaseButton)({
  backgroundColor: '#1976D2',
  color: 'white',
  '&:hover': {
    backgroundColor: '#1565C0',
  },
})

export const OutlineButtonBlack = styled(BaseButton)({
  backgroundColor: 'transparent',
  border: '1px solid #a5a5a5',
  color: 'rgba(0, 0, 0, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
})

export const OutlineButtonBlue = styled(BaseButton)({
  backgroundColor: 'transparent',
  border: '1px solid #1976D2',
  color: '#1976D2',
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.05)',
  },
})
