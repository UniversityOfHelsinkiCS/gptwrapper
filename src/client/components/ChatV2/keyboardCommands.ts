import { useEffect } from 'react'

export const useKeyboardCommands = ({ resetChat }: { resetChat: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'w' && event.ctrlKey) {
        resetChat()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [resetChat])
}
