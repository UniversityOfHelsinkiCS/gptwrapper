import { MutableRefObject, useEffect, useRef, useState } from "react"

export const useChatScroll = (appContainerRef,   endOfConversationRef) => {
  
  const oldScrollValue = useRef(0)
  const [shouldScroll, setShouldScroll] = useState(true)// modified by handleUserScroll to enable/disable if user is at the end of appContainerRef

  const scrollAnimationFrame: MutableRefObject<number | null> = useRef(null)
  //is called by 'scroll' event listener
  function handleUserScroll(){
     const bottomOffset = 10 // pixels
     if ( !appContainerRef?.current){
       return
     }
    const scrollValue: number | undefined = appContainerRef.current?.scrollTop
      const maxScrollValue: number = appContainerRef.current?.scrollHeight - appContainerRef.current.clientHeight
      if(!scrollValue){
        return
      }
      // console.log('new scroll: ' + scrollValue)
      // console.log('old scroll: ' + oldScrollValue.current)
      // console.log('max scroll: ' + maxScrollValue)
      if (scrollValue + 10 < oldScrollValue.current) {
        console.log('User scrolled upward cancelling the auto scroll down');
        if(shouldScroll){
          
        cancelScroll()
        }
      }

      if(scrollValue >= maxScrollValue - bottomOffset){
          console.log('User scrolled to the bottom, enabling autoscroll down')

          if(!shouldScroll){
            
          setShouldScroll(true)
          }
      }

      oldScrollValue.current = scrollValue != undefined ? scrollValue : 0
  }
  //is called by the setInterval call
  function autoScroll(){
    console.log("checking")
    console.log(endOfConversationRef.current)
    console.log(shouldScroll)
   if(!endOfConversationRef?.current || shouldScroll === false){
     return
   }
   smoothScrollTo(100)

  }

  const cancelScroll = () => {
    if( shouldScroll){
      
    setShouldScroll(false)
    }
    console.log("CANCEL")
    if(scrollAnimationFrame?.current){
      console.log("cancelled animation frame", scrollAnimationFrame.current)

      cancelAnimationFrame(scrollAnimationFrame.current)
      scrollAnimationFrame.current = null    
    }
            
  }
 const smoothScrollTo = (duration: number) => {
    const startTime = performance.now()
    const startY = appContainerRef.current.scrollTop
    const targetY = endOfConversationRef.current.offsetTop
    const distance = targetY - startY
    // console.log("starttime" + startTime)
    function step(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.max(Math.min(elapsed / duration, 1), 0)
      // console.log('ellapsed'+ elapsed)
      // console.log("progress"+ progress)
      // const ease = Math.max(1 - progress, 0) //speeds up in the start since progress grows from 0 -> 1, this drops from 1 -> 0
      // const ease = ellapsed <  ? 0.1
      appContainerRef.current.scrollTo(0, startY + distance * progress)
  
      if (progress < 1 && shouldScroll) {
        scrollAnimationFrame.current = requestAnimationFrame(step)
      }
    }

    scrollAnimationFrame.current = requestAnimationFrame(step)

    }

    useEffect(() => {
    // console.log("hit")

    if (!appContainerRef?.current || !endOfConversationRef.current) return
    appContainerRef.current.addEventListener("scroll",handleUserScroll)
    appContainerRef.current.addEventListener("wheel", () => {cancelScroll()})

    // appContainerRef.current.addEventListener("touchstart", () => {cancelScroll()})
    appContainerRef.current.addEventListener("touchmove", () => {cancelScroll()})
    appContainerRef.current.addEventListener("mousedown", () => {cancelScroll()})
    appContainerRef.current.addEventListener("keydown", () => {cancelScroll()})



    // const interval = setInterval(autoScroll, 500)

    //scroll to the bottom of the conversation at the start
    // endOfConversationRef.current.scrollIntoView({behavior: 'smooth'});
  
    return () => {
      // clearInterval(interval)
      appContainerRef?.current?.removeEventListener('scroll', handleUserScroll)
    }
  }, [shouldScroll])
  return {
    shouldScroll,
    setShouldScroll,
    autoScroll
  }
 }
  
