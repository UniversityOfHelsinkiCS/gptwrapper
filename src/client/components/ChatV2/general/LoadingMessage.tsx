import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { ToolCallStatusEvent } from '../../../../shared/chat'

const loadingDotStyle = (delay: number) => ({
  width: 5,
  height: 5,
  borderRadius: '100%',
  margin: 3,
  backgroundColor: 'rgba(0,0,0,0.4)',
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

const sourcesTextStyle = {
  fontStyle: 'italic',
  ml: '1rem',
  color: 'rgba(0,0,0,0.8)',
  animation: 'slideIn 0.3s ease-out',
}

export const LoadingMessage = ({ toolCalls }: { toolCalls: Record<string, ToolCallStatusEvent> }) => {
  const { t } = useTranslation()

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
        <div style={loadingDotStyle(0)} />
        <div style={loadingDotStyle(0.15)} />
        <div style={loadingDotStyle(0.3)} />
        {toolCallMessages.map((tc) => (
          <Typography key={tc.callId} sx={sourcesTextStyle} data-testid="tool-call-message">
            {tc.text}
          </Typography>
        ))}
      </div>
    </div>
  )
}
