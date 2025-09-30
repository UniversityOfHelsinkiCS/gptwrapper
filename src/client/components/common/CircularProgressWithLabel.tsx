import { Box, CircularProgress, Typography } from '@mui/material'

export const CircularProgressWithLabel = ({
  progress,
  label = undefined,
  accentColor = 'info',
  size = 100,
}: {
  progress: number
  label?: string
  accentColor?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
  size?: number
}) => (
  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
    <CircularProgress variant="determinate" value={progress} size={size} color={accentColor} />
    <Box
      sx={{
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box display="flex" flexDirection="column" alignItems="center" width={size + 10}>
        <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
          {label ?? `${Math.round(progress)}%`}
        </Typography>
      </Box>
    </Box>
  </Box>
)
