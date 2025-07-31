import { MutableRefObject, useEffect, useRef, useState } from "react"

export const useChatScroll = (appContainerRef,   endOfConversationRef) => {
  
  const oldScrollValue = useRef(0)
  const shouldScroll = useRef(true)
  const startTime = useRef(0)
  const elapsed = useRef(0)
    const progress = useRef(0)
    const ticks = useRef(0)
         // console.log("starttime" + startTime)
    
  const scrollAnimationFrame: MutableRefObject<number | null> = useRef(null)
  //is called by 'scroll' event listener
  function handleUserScroll(){
     const bottomOffset = 10 // pixels
     if ( !appContainerRef?.current){
       return
     }
    const scrollValue: number | undefined = appContainerRef.current?.scrollTop
      // console.log("it works")
      const maxScrollValue: number = appContainerRef.current?.scrollHeight - appContainerRef.current.clientHeight
      if(!scrollValue){
        return
      }
      // console.log('new scroll: ' + scrollValue)
      // console.log('old scroll: ' + oldScrollValue.current)
      // console.log('max scroll: ' + maxScrollValue)
      if (scrollValue + 10 < oldScrollValue.current) {
        console.log('User scrolled upward cancelling the auto scroll down');
        cancelScroll()
      }

      if(scrollValue >= maxScrollValue - bottomOffset){
          // console.log('User scrolled to the bottom, enabling autoscroll down')
          shouldScroll.current = true
      }

      oldScrollValue.current = scrollValue != undefined ? scrollValue : 0
  }
  //is called by the setInterval call
  async function autoScroll(){
   if(!endOfConversationRef?.current || shouldScroll.current === false){
     return
   }
   //lets not start another animation if there is one already
   if(scrollAnimationFrame.current){
     return
   }

   
   smoothScrollTo(1000)

  }

  const cancelScroll = () => {
    shouldScroll.current = false
    // console.log("CANCEL")
    if(scrollAnimationFrame?.current){
      // console.log("cancelled animation frame", scrollAnimationFrame.current)

      cancelAnimationFrame(scrollAnimationFrame.current)
      scrollAnimationFrame.current = null    
    }
            
  }
function step(currentTime) {
      if(shouldScroll.current === false){
       startTime.current = null
    // const startY = appContainerRef.current.scrollTop
        elapsed.current = 1
        progress.current = 0
        ticks.current = 0
        scrollAnimationFrame.current = null
        return
      }


    const duration = 1000
     ticks.current++
     console.log("tick"+ ticks.current)

      if(!startTime.current){
        startTime.current = performance.now()
      }
      elapsed.current = performance.now() - startTime.current
      progress.current = Math.min(elapsed.current / duration, 1)
      // console.log('ellapsed'+ elapsed)
      const targetY = endOfConversationRef.current.offsetTop
      console.log("progress"+ progress.current)
      console.log("start time is"+ startTime.current)
      // const ease = Math.max(1 - progress, 0) //speeds up in the start since progress grows from 0 -> 1, this drops from 1 -> 0
      // const ease = ellapsed <  ? 0.1
      appContainerRef.current.scrollTo(0, targetY * progress.current)
    
  
      if (progress.current < 1) {
        scrollAnimationFrame.current = requestAnimationFrame(step)
      }
      else{
        scrollAnimationFrame.current = null
      }
    }

    const smoothScrollTo =  (duration: number) => {
     // console.log("started smooth scroll!")
      startTime.current = null
    // const startY = appContainerRef.current.scrollTop
      elapsed.current = 1
        progress.current = 0
        ticks.current = 0
         // console.log("starttime" + startTime)
    

   scrollAnimationFrame.current = requestAnimationFrame(step)

    }

    useEffect(() => {
    // console.log("hit")

    if (!appContainerRef?.current || !endOfConversationRef.current) return
    appContainerRef.current.addEventListener("scroll",handleUserScroll)

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
    autoScroll
  }
 }
  
