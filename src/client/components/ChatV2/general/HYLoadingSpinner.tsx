import { Box, CircularProgress, Typography } from '@mui/material'
import hyLogo from '../../../assets/hy_logo.svg'

export default function HYLoadingSpinner() {
  return (
    <Box sx={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <Box
        component="img"
        src={hyLogo}
        alt="University of Helsinki"
        sx={{
          width: { xs: '80px', sm: '120px', md: '200px' },
          opacity: 0.2,
          mb: 4,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
        <Typography variant="h6" fontWeight="bold">
          CURRECHAT
        </Typography>
        <CircularProgress size="2rem" sx={{ ml: 4, color: 'text.primary' }} />
      </Box>
    </Box>
  )
}
