import type { ReactNode } from 'react'
import { Button } from '@mui/material'

export default function SettingsButton({ children, startIcon, onClick }: { children: ReactNode; startIcon?: ReactNode; onClick: () => any }) {
  return (
    <Button
      onClick={onClick}
      startIcon={startIcon}
      sx={{
        textTransform: 'none',
        color: 'black',
        border: '1px solid black',
        borderRadius: '16px',
        padding: '0.3rem 0.9rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      {children}
    </Button>
  )
}
