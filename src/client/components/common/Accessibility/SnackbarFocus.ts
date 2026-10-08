export const SNACKBAR_CONTAINER = '.notistack-SnackbarContainer'

const CLOSE_BUTTON = '[data-snackbar-close]'

let focusOutsideSnackbars: HTMLElement | null = null

export const rememberFocusOutsideSnackbars = (element: EventTarget | null) => {
  if (element instanceof HTMLElement && element !== document.body && !element.closest(SNACKBAR_CONTAINER)) {
    focusOutsideSnackbars = element
  }
}

/*
 The focused close button is removed with its snackbar, and focus would fall to the body.
 Focus moves to the next open snackbar, or the previous one when the last was closed.
 When none are left open, it moves to the chat input, where the user most likely continues,
 and on pages without one back to where it was before the notifications.
*/
export const findFocusAfterClose = (closeButton: HTMLElement, isOpen: (key: string | undefined) => boolean) => {
  const openButtons = Array.from(document.querySelectorAll<HTMLElement>(`${SNACKBAR_CONTAINER} ${CLOSE_BUTTON}`)).filter(
    (button) => button === closeButton || isOpen(button.dataset.snackbarClose),
  )
  const index = openButtons.indexOf(closeButton)
  const nextOpen = openButtons[index + 1] ?? openButtons[index - 1]
  if (nextOpen) return nextOpen

  const chatInput = document.getElementById('chat-input')
  if (chatInput) return chatInput

  return focusOutsideSnackbars?.isConnected ? focusOutsideSnackbars : null
}
