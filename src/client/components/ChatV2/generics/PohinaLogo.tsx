import { Box, Typography } from '@mui/material'
import { Assistant } from '@mui/icons-material'

export const PöhinäLogo = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '40rem',
      transition: 'opacity 0.6s, transform 0.6s',
      opacity: 1,
      transform: 'scale(1)',
      animation: 'fadeInScale 0.6s ease',
      '@keyframes fadeInScale': {
        from: { opacity: 0, transform: 'scale(0.8)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}
  >
    <Assistant sx={{ fontSize: 160, color: '#efefef', marginBottom: '2rem' }} />
    <Typography>Aloite keskustelu läettämällä viesti...</Typography>
  </Box>
)