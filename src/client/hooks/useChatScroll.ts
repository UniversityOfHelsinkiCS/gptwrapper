import { useEffect, useState } from 'react'

let isUserDisabled = false

export const useChatScroll = () => {
  // Todo: on long conversations this state update is not optimal. Ideally move it down the component tree.
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  const autoScroll = () => {
    if (isUserDisabled) return

    window.scrollTo({
      top: document.body.scrollHeight,
    })
  }

  const beginAutoscroll = () => {
    isUserDisabled = false
    setIsAutoScrolling(true)
    window.scrollTo({
      top: document.body.scrollHeight,
    })
  }

  useEffect(() => {
    const handleAttachAutoScroll = () => {
      const element = document.documentElement
      const isAtBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) <= 3
      if (isAtBottom) {
        setIsAutoScrolling(true)
        isUserDisabled = false
      }
    }

    const detachAutoScroll = () => {
      isUserDisabled = true
      setIsAutoScrolling(false)
    }

    const handleDetachScrollOnWheel = (ev: WheelEvent) => {
      // Check that wheel is moved so content is scrolled back up
      if (ev.deltaY < 0) {
        detachAutoScroll()
      }
    }

    const handleDetachScrollOnTouchMove = (ev: TouchEvent) => {
      // Check that touch is moved
      if (ev.changedTouches.length > 0) {
        detachAutoScroll()
      }
    }

    const handleDetachScrollOnKeydown = (ev: KeyboardEvent) => {
      // Check that upwards scrolling key is pressed
      if (ev.key === 'ArrowUp' || ev.key === 'PageUp') {
        detachAutoScroll()
      }
    }

    window.addEventListener('wheel', handleDetachScrollOnWheel)
    window.addEventListener('touchmove', handleDetachScrollOnTouchMove)
    window.addEventListener('keydown', handleDetachScrollOnKeydown)
    window.addEventListener('scrollend', handleAttachAutoScroll)

    return () => {
      window.removeEventListener('wheel', handleDetachScrollOnWheel)
      window.removeEventListener('touchmove', handleDetachScrollOnTouchMove)
      window.removeEventListener('keydown', handleDetachScrollOnKeydown)
      window.removeEventListener('scrollend', handleAttachAutoScroll)
    }
  }, [])

  return {
    autoScroll,
    isAutoScrolling,
    beginAutoscroll,
  }
}
