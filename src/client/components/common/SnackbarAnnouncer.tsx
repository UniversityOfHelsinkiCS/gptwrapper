import Close from '@mui/icons-material/Close'
import { Box, IconButton } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { closeSnackbar, type SnackbarKey } from 'notistack'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/*
 Screen readers announce reliably only changes inside a live region that already exists in the DOM.
 Notistack mounts each snackbar (with role="alert") together with its text, which many screen readers
 announce late or not at all. The regions below are always mounted and the snackbar text is copied into them.
*/
type VisibleSnackbar = { key: SnackbarKey; message: string; assertive: boolean }
type Announcement = { messages: string[]; assertive: boolean }

/*
 A new live region update interrupts the one being read, so of messages arriving close together only the last
 would be heard. Instead every announcement contains all snackbars currently visible, newest first.
*/
let visibleSnackbars: VisibleSnackbar[] = []
let listener: (() => void) | null = null

export const announceSnackbar = (node: HTMLElement, _isAppearing: boolean, key: SnackbarKey) => {
  const message = node.querySelector('#notistack-snackbar')?.textContent?.trim()
  if (!message) return

  // The persistent regions do the announcing, prevent the snackbar itself from being read a second time
  node.querySelector('[role="alert"]')?.removeAttribute('role')

  const assertive = !!node.querySelector('.notistack-MuiContent-error, .notistack-MuiContent-warning')
  visibleSnackbars = [...visibleSnackbars.filter((snackbar) => snackbar.key !== key), { key, message, assertive }]
  listener?.()
}

export const forgetSnackbar = (_node: HTMLElement, key: SnackbarKey) => {
  visibleSnackbars = visibleSnackbars.filter((snackbar) => snackbar.key !== key)
}

/*
 An open MUI modal sets aria-hidden on every other child of body and its dialog has aria-modal,
 so screen readers ignore live regions outside of it. Returns the element the regions must live in:
 the topmost open modal (its aria-modal element if it has one) or body.
*/
const findAnnouncerContainer = () => {
  const openModals = Array.from(document.body.children).filter(
    (element) => element.classList.contains('MuiModal-root') && element.getAttribute('aria-hidden') !== 'true',
  )
  const topModal = openModals.at(-1)
  if (!topModal) return document.body

  return topModal.querySelector<HTMLElement>('[aria-modal="true"]') ?? (topModal as HTMLElement)
}

const useAnnouncerContainer = () => {
  const [container, setContainer] = useState<HTMLElement>(() => findAnnouncerContainer())

  useEffect(() => {
    const update = () => setContainer(findAnnouncerContainer())
    // MUI toggles aria-hidden on body's children when modals open and close, and mounts modals directly into body.
    // childList is observed without subtree so that ordinary DOM updates inside the app do not trigger this.
    const ariaHiddenObserver = new MutationObserver(update)
    ariaHiddenObserver.observe(document.body, { subtree: true, attributeFilter: ['aria-hidden'] })
    const childObserver = new MutationObserver(update)
    childObserver.observe(document.body, { childList: true })
    update()

    return () => {
      ariaHiddenObserver.disconnect()
      childObserver.disconnect()
    }
  }, [])

  return container
}

// Long enough to be read, short enough that stale messages are not found later with the virtual cursor
const MESSAGE_LIFETIME = 7_000

export const SnackbarAnnouncer = () => {
  const { t } = useTranslation()
  const container = useAnnouncerContainer()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    let announceTimeout: ReturnType<typeof setTimeout> | undefined
    let clearAnnouncementTimeout: ReturnType<typeof setTimeout> | undefined

    listener = () => {
      // Clear first so that the same text is announced again.
      // The delay makes sure the region exists in the DOM first, e.g. right after it moved into a modal,
      // and snackbars enqueued at the same time end up in the same announcement as it is built only when it fires.
      setAnnouncement(null)
      clearTimeout(announceTimeout)
      clearTimeout(clearAnnouncementTimeout)

      announceTimeout = setTimeout(() => {
        const newestFirst = [...visibleSnackbars].reverse()
        if (newestFirst.length === 0) return

        setAnnouncement({ messages: newestFirst.map((snackbar) => snackbar.message), assertive: newestFirst[0].assertive })
        clearAnnouncementTimeout = setTimeout(() => setAnnouncement(null), MESSAGE_LIFETIME)
      }, 100)
    }

    return () => {
      listener = null
      clearTimeout(announceTimeout)
      clearTimeout(clearAnnouncementTimeout)
    }
  }, [])

  const content = announcement && (
    <>
      {announcement.messages.length > 1 && <p>{t('accessibility:notificationCount', { count: announcement.messages.length })}</p>}
      {announcement.messages.map((message, index) => (
        <p key={index}>{message}</p>
      ))}
    </>
  )

  // No role: role="status" and role="alert" would add their own semantics on top of aria-live
  return createPortal(
    <Box data-testid="snackbar-announcer" sx={visuallyHidden}>
      <div aria-live="polite" aria-atomic="true" data-testid="snackbar-announcer-polite">
        {announcement && !announcement.assertive && content}
      </div>
      <div aria-live="assertive" aria-atomic="true" data-testid="snackbar-announcer-assertive">
        {announcement?.assertive && content}
      </div>
    </Box>,
    container,
  )
}

export const SnackbarCloseButton = ({ snackbarId }: { snackbarId: SnackbarKey }) => {
  const { t } = useTranslation()

  return (
    <IconButton aria-label={t('accessibility:closeNotification')} color="inherit" size="small" onClick={() => closeSnackbar(snackbarId)}>
      <Close fontSize="small" />
    </IconButton>
  )
}
