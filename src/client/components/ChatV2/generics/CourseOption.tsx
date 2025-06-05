import { useState, type ReactNode } from 'react'
import { Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function CourseOption({ children, link }: { children: ReactNode; link: string }) {
  const [isHovered, setIsHovered] = useState<boolean>(false)

  return (
    <Typography
      sx={{
        backgroundColor: isHovered ? '#efefef' : 'transparent',
        color: 'black',
        cursor: 'pointer',
        borderRadius: '0.5rem',
        padding: '0.5rem 1rem',
        transitionDuration: '200ms',
        textDecoration: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link style={{ textDecoration: 'none', textTransform: 'none' }} to={link}>
        {children}
      </Link>
    </Typography>
  )
}
