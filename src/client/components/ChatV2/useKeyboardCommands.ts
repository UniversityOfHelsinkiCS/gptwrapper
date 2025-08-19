import { useEffect } from 'react'

const isMacOS = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  return userAgent.indexOf('mac') !== -1
}

export const KeyCombinations = {
  // @todo key combinations for non-macOS
  RESET_CHAT: isMacOS()
    ? {
        key: 'w',
        ctrlKey: true,
        hint: '(ctrl + W)',
      }
    : undefined,
  OPEN_MODEL_SELECTOR: isMacOS()
    ? {
        key: 'm',
        ctrlKey: true,
        hint: '(ctrl + M)',
      }
    : undefined,
}

export const useKeyboardCommands = ({ resetChat, openModelSelector }: { resetChat: () => void; openModelSelector: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const resetChatKey = KeyCombinations.RESET_CHAT
      const openModelSelectorKey = KeyCombinations.OPEN_MODEL_SELECTOR

      if (resetChatKey && event.key === resetChatKey.key && event.ctrlKey === resetChatKey.ctrlKey) {
        resetChat()
      }

      if (openModelSelectorKey && event.key === openModelSelectorKey.key && event.ctrlKey === openModelSelectorKey.ctrlKey) {
        openModelSelector()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [resetChat, openModelSelector])
}
