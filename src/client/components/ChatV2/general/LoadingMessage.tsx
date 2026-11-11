import { useTheme } from '@mui/material'

const loadingDotStyle = (delay: number, color: string) => ({
  width: 5,
  height: 5,
  borderRadius: '100%',
  margin: 3,
  backgroundColor: color,
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

export const LoadingMessage = () => {
  const theme = useTheme()
  const dotColor = theme.palette.text.secondary

  return (
    <div className="message-role-assistant">
      <style>
        {`
          @keyframes bounceWave {
            0%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-8px);
            }
          }
        `}
      </style>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', minHeight: '4rem' }}>
        <div style={loadingDotStyle(0, dotColor)} />
        <div style={loadingDotStyle(0.15, dotColor)} />
        <div style={loadingDotStyle(0.3, dotColor)} />
      </div>
    </div>
  )
}
