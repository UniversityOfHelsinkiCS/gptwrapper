import { useEffect, useRef } from "react"

export const useChatScroll = (appContainerRef,   endOfConversationRef) => {
  
  const oldScrollValue = useRef(0)
  const shouldScroll = useRef(true) // modified by handleUserScroll to enable/disable if user is at the end of appContainerRef

  const scrollEnabled = useRef(true) //set to false to disable scrolling completely
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
      if (scrollValue < oldScrollValue.current) {
        // console.log('User scrolled upward cancelling the auto scroll down');
        shouldScroll.current = false
      }

      if(scrollValue >= maxScrollValue - bottomOffset){
          // console.log('User scrolled to the bottom, enabling autoscroll down')
          shouldScroll.current = true
      }

      oldScrollValue.current = scrollValue != undefined ? scrollValue : 0
  }
  //is called by the setInterval call
  function autoScroll(){
    if(!scrollEnabled.current || !endOfConversationRef?.current || !shouldScroll.current){
      return
    }
    endOfConversationRef.current.scrollIntoView({behavior: 'smooth'});
  }


  useEffect(() => {
    // console.log("hit")

    // if (!appContainerRef?.current || !endOfConversationRef.current) return
    appContainerRef.current.addEventListener("scroll",handleUserScroll)
    const interval = setInterval(autoScroll, 500)

    //scroll to the bottom of the conversation at the start
    // endOfConversationRef.current.scrollIntoView({behavior: 'smooth'});
  
    return () => {
      clearInterval(interval)
      appContainerRef?.current?.removeEventListener('scroll', handleUserScroll)
    }
  }, [])
  return {
    scrollEnabled,
    autoScroll
  }
 }
  
