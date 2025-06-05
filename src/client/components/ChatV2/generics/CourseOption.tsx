import type { ReactNode } from 'react'
import { Button } from '@mui/material'

export default function CourseOption({ children, link }: { children: ReactNode; link: string }) {
  return (
    <Button
      variant="text"
      fullWidth
      sx={{
        justifyContent: 'flex-start',
        color: 'black',
        cursor: 'pointer',
        borderRadius: '0.5rem',
        padding: '0.4rem 1rem',
        transitionDuration: '200ms',
        textTransform: 'none',
      }}
      href={link}
    >
      {children}
    </Button>
  )
}
