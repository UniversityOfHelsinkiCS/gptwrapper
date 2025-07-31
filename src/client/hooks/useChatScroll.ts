import { MutableRefObject, useEffect, useRef, useState } from 'react'

export const useChatScroll = (appContainerRef, endOfConversationRef) => {
  const oldScrollValue = useRef(0)
  const shouldScroll = useRef(true)
  const startTime = useRef(0)
  const elapsed = useRef(0)
  const progress = useRef(0)
  const ticks = useRef(0)
  // console.log("starttime" + startTime)

  const scrollAnimationFrame: MutableRefObject<number | null> = useRef(null)
  //is called by 'scroll' event listener
  function handleUserScroll() {
    const bottomOffset = 10 // pixels
    if (!appContainerRef?.current) {
      return
    }
    const scrollValue: number | undefined = appContainerRef.current?.scrollTop
    // console.log("it works")
    const maxScrollValue: number = appContainerRef.current?.scrollHeight - appContainerRef.current.clientHeight
    if (!scrollValue) {
      return
    }
    if (scrollValue + 10 < oldScrollValue.current) {
      cancelScroll()
    }

    if (scrollValue >= maxScrollValue - bottomOffset) {
      shouldScroll.current = true
    }

    oldScrollValue.current = scrollValue != undefined ? scrollValue : 0
  }
  //is called by the setInterval call
  async function autoScroll() {
    if (!endOfConversationRef?.current || shouldScroll.current === false) {
      cancelScroll()
      return

    }
    //lets not start another animation if there is one already
    if (scrollAnimationFrame.current) {
      return
    }
    smoothScrollTo(1000)
  }

  const cancelScroll = () => {
    startTime.current = null
    elapsed.current = 1
    progress.current = 0
    ticks.current = 0
    shouldScroll.current = false
    if (scrollAnimationFrame?.current) {
      cancelAnimationFrame(scrollAnimationFrame.current)
      scrollAnimationFrame.current = null
    }
  }
  function step(currentTime) {
    if (shouldScroll.current === false) {
      cancelScroll()
      return
    }

    const duration = 10000
    ticks.current++

    if (!startTime.current) {
      startTime.current = performance.now()
    }
    elapsed.current = performance.now() - startTime.current
    progress.current = Math.min(elapsed.current / duration, 1)
    const startY = appContainerRef.current.scrollTop
    const targetY = endOfConversationRef.current.offsetTop
    const distance = targetY - startY
    const viewPortHeight = appContainerRef.current.getBoundingClientRect().height
    appContainerRef.current.scrollTo(0, startY + distance * progress.current)

    if (progress.current < 1 && distance > viewPortHeight) {
      scrollAnimationFrame.current = requestAnimationFrame(step)
    } else {
      cancelScroll()
    }
  }

  const smoothScrollTo = (duration: number) => {
    scrollAnimationFrame.current = requestAnimationFrame(step)
  }

  useEffect(() => {
    if (!appContainerRef?.current || !endOfConversationRef.current) return
    appContainerRef.current.addEventListener('scroll', handleUserScroll)
    return () => {
      appContainerRef?.current?.removeEventListener('scroll', handleUserScroll)
    }
  }, [shouldScroll])
  return {
    shouldScroll,
    autoScroll,
  }
}
