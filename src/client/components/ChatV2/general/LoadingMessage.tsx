import { Typography, useTheme } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ToolCallStatusEvent } from '../../../../shared/chat'

const loadingDotStyle = (delay: number, color: string) => ({
  width: 5,
  height: 5,
  borderRadius: '100%',
  margin: 3,
  backgroundColor: color,
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

export const LoadingMessage = ({ toolCalls }: { toolCalls: Record<string, ToolCallStatusEvent> }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const dotColor = theme.palette.text.secondary

  const toolCallMessages = Object.values(toolCalls)

  return (
    <div className="message-role-assistant" style={{ height: 'inherit' }}>
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

          @keyframes slideIn {
            0% {
              transform: translateX(-20px);
              opacity: 0;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={{ alignItems: 'center', display: 'flex', height: '4rem' }}>
        <div style={loadingDotStyle(0, dotColor)} />
        <div style={loadingDotStyle(0.15, dotColor)} />
        <div style={loadingDotStyle(0.3, dotColor)} />
        {toolCallMessages.map((tc) => (
          <Typography
            key={tc.callId}
            sx={{ fontStyle: 'italic', ml: '1rem', color: 'text.secondary', animation: 'slideIn 0.3s ease-out' }}
            data-testid="tool-call-message"
          >
            {tc.text}
          </Typography>
        ))}
      </div>
    </div>
  )
}
