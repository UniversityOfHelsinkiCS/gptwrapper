import type { ReactNode } from 'react'
import { Button } from '@mui/material'

export default function SettingsButton({
  children,
  startIcon,
  endIcon,
  onClick,
}: {
  children: ReactNode
  startIcon?: ReactNode
  endIcon?: ReactNode
  onClick: () => any
}) {
  return (
    <Button
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        textTransform: 'none',
        color: 'black',
        // border: '1px solid black',
        backgroundColor: '#efefef',
        borderRadius: '16px',
        padding: '0.5rem 0.9rem',
        // boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </Button>
  )
}
