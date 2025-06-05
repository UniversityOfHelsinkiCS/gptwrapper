import { Box, Typography } from '@mui/material'
import hyLogo from '../../../assets/hy_logo.svg'


export const ConversationSplash = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
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
    <img src={hyLogo} alt="University of Helsinki" width="240" style={{ opacity: 0.1, marginBottom: '2rem' }} />
    <Typography fontStyle="italic" color="rgba(0,0,0,0.5)">
      Aloita keskustelu läettämällä viesti...
    </Typography>
  </Box>
)