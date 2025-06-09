import { useState, type ReactNode } from 'react'
import { Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function CourseOption({ children, link, isActive }: { children: ReactNode; link: string; isActive: boolean }) {
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const navigate = useNavigate()

  return (
    <Typography
      sx={{
        backgroundColor: isHovered || isActive ? '#efefef' : 'transparent',
        cursor: 'pointer',
        borderRadius: '0.5rem',
        padding: '0.5rem 1rem',
        transitionDuration: '200ms',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(link)}
    >
      {children}
    </Typography>
  )
}
