import { useEffect, useRef, useState, useTransition } from 'react'

let isUserDisabled = false

const isAtBottom = () => {
  const element = document.documentElement
  const dist = element.scrollHeight - element.clientHeight - element.scrollTop
  return Math.abs(dist) <= 3
}

export const useChatScroll = () => {
  // Todo: on long conversations this state update is not optimal. Ideally move it down the component tree.
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)

  const prevHeight = useRef(0)

  const [transitionPending, startTransition] = useTransition()

  const autoScroll = () => {
    if (isUserDisabled || transitionPending) {
      return
    }

    const heightDiff = document.body.scrollHeight - prevHeight.current

    if (heightDiff > 0) {
      startTransition(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'instant',
        })
        prevHeight.current = document.body.scrollHeight
      })
    }
  }

  const beginAutoscroll = () => {
    startTransition(() => {
      isUserDisabled = false
      setIsAutoScrolling(true)
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      })
    })
  }

  useEffect(() => {
    // Check scroll status after a delay
    setTimeout(() => {
      if (!isAtBottom()) {
        setIsAutoScrolling(false)
      }
    }, 100)

    const handleAttachAutoScroll = () => {
      if (isAtBottom()) {
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
      if (ev.key === 'ArrowUp' || ev.key === 'PageUp' || ev.key === 'Home') {
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
