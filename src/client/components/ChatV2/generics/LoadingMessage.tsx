const dotStyle = (delay: number) => ({
  width: 4,
  height: 4,
  margin: '0 4px',
  borderRadius: '50%',
  backgroundColor: '#666',
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

export const LoadingMessage = ({ expandedNodeHeight }: { expandedNodeHeight: number }) => (
  <div
    className="message-role-assistant"
    style={{
      height: expandedNodeHeight,
      display: 'flex',
      padding: '2rem',
    }}
  >
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
    <div style={dotStyle(0)} />
    <div style={dotStyle(0.15)} />
    <div style={dotStyle(0.3)} />
  </div>
)
