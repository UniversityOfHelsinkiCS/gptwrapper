import Button from '@mui/material/Button'
import { styled } from '@mui/material'
import { Link } from 'react-router-dom'
import { OpenInNew } from '@mui/icons-material'
import type { ElementType, ReactNode } from 'react'

const BaseButton = styled(Button)({
  color: 'rgba(0, 0, 0, 0.86)',
  textTransform: 'none',
  borderRadius: '1.25rem',
  boxShadow: '0 1px 2px lightgray',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '.4rem .8rem',
  whiteSpace: 'nowrap',
  minWidth: 'fit-content',
  '& .MuiButton-startIcon': {
    fontSize: '1.2rem',
  },
  '& .MuiButton-startIcon > *:nth-of-type(1)': {
    fontSize: '1.2rem',
  },
  '& .MuiButton-endIcon': {
    fontSize: '1.2rem',
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

export const GreenButton = styled(BaseButton)({
  backgroundColor: '#43A047',
  color: 'white',
  '&:hover': { backgroundColor: '#388E3C' }
})

export const RedButton = styled(BaseButton)({
  backgroundColor: '#d32f2f',
  color: 'white',
  '&:hover': {
    backgroundColor: '#b71c1c',
  },
})

export const OrangeButton = styled(BaseButton)({
  backgroundColor: '#ed6c02',
  color: 'white',
  '&:hover': {
    backgroundColor: '#e65100',
  },
})

export const OutlineButtonBlack = styled(BaseButton)({
  backgroundColor: 'transparent',
  backdropFilter: 'blur(5px)',
  border: '1px solid #a5a5a5',
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

export const TextButton = styled(BaseButton)({
  backgroundColor: 'transparent',
  boxShadow: 'none',
  border: 'none',
  '&:hover': {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  '&.Mui-disabled': {
    backgroundColor: 'transparent',
    color: 'rgba(0, 0, 0, 0.3)',
    boxShadow: 'none',
  },
})

type LinkButtonHocProps = {
  button: ElementType
  to: string
  children: ReactNode
  endIcon?: ReactNode
  external?: boolean
}

export const LinkButtonHoc = ({
  button: ButtonComponent,
  to,
  children,
  endIcon,
  external,
}: LinkButtonHocProps) => (
  <ButtonComponent
    component={external ? 'a' : Link}
    // when external use href, otherwise use to for react-router Link
    to={external ? undefined : to}
    href={external ? to : undefined}
    endIcon={endIcon ?? (external ? <OpenInNew /> : undefined)}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    {children}
  </ButtonComponent>
)
