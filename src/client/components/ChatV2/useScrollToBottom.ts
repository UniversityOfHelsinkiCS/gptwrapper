import { useEffect } from 'react'

export const useScrollToBottom = (chatContainerRef: React.RefObject<HTMLElement>, appContainerRef: React.RefObject<HTMLElement>, messages: any[]) => {
  useEffect(() => {
    const chatContainer = chatContainerRef.current
    const appContainer = appContainerRef.current

    if (!chatContainer || !appContainer || !messages.length) return

    const scrollToBottom = () => {
      appContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      scrollToBottom()
    })

    resizeObserver.observe(chatContainer)

    return () => resizeObserver.disconnect()
  }, [chatContainerRef, appContainerRef, messages.length])
}
