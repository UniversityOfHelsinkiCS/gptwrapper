export const setupWindowMessageListeners = () => {
  const eventListener = (event: MessageEvent<any>) => {
    if (event.data?.type === 'login-query') {
      window.opener.postMessage({ type: "login-success", nonce: event.data?.nonce }, { targetOrigin: event.origin })
      window.close() // <- this may fail, but we can try. If it fails, user can close the window manually.
    } else if (event.data?.type === 'ping') {
      console.log("Received ping, sending pong")
      event.source?.postMessage({ type: 'pong' }, { targetOrigin: event.origin })
    }
  }

  window.addEventListener('message', eventListener)
}
