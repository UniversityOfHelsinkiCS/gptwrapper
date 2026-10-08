import { Box } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import type { SnackbarKey } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/*
 Screen readers announce reliably only changes inside a live region that already exists in the DOM.
 Notistack mounts each snackbar (with role="alert") together with its text, which many screen readers
 announce late or not at all. The regions below are always mounted and the snackbar text is copied into them.
*/
type Severity = 'error' | 'warning' | null
type VisibleSnackbar = { key: SnackbarKey; message: string; severity: Severity; announcedAt: number }
type Announcement = { messages: string[]; assertive: boolean }

// Long enough to be read, short enough that stale messages are not found later with the virtual cursor
const MESSAGE_LIFETIME = 7_000

// Covers a modal's closing transition: focus moved this soon after an announcement cut it off, see SnackbarAnnouncer
const FOCUS_INTERRUPTS_WITHIN = 1_000

/*
 A new live region update interrupts the one being read, so of messages arriving close together only the last
 would be heard. Instead every announcement also repeats the snackbars announced within MESSAGE_LIFETIME, newest first.
 Older ones are left out, snackbars stay visible longer than that and would otherwise be repeated over and over.
*/
let visibleSnackbars: VisibleSnackbar[] = []
let listener: (() => void) | null = null

// The container notistack renders the snackbars in, labelled as a region with the number of snackbars open
let snackbarRegion: HTMLElement | null = null
let countListener: ((count: number) => void) | null = null

const getSeverity = (node: HTMLElement): Severity => {
  if (node.querySelector('.notistack-MuiContent-error')) return 'error'
  if (node.querySelector('.notistack-MuiContent-warning')) return 'warning'
  return null
}

export const announceSnackbar = (node: HTMLElement, _isAppearing: boolean, key: SnackbarKey) => {
  const message = node.querySelector('#notistack-snackbar')?.textContent?.trim()
  if (!message) return

  // The persistent regions do the announcing, prevent the snackbar itself from being read a second time
  node.querySelector('[role="alert"]')?.removeAttribute('role')
  snackbarRegion = node.closest<HTMLElement>('.notistack-SnackbarContainer')

  const snackbar = { key, message, severity: getSeverity(node), announcedAt: Date.now() }
  visibleSnackbars = [...visibleSnackbars.filter((visible) => visible.key !== key), snackbar]
  countListener?.(visibleSnackbars.length)
  listener?.()
}

// Called when the user causes a message that is already visible: it is not shown twice but must be heard again
export const reannounceSnackbar = (key: SnackbarKey) => {
  const snackbar = visibleSnackbars.find((visible) => visible.key === key)
  if (!snackbar) return

  visibleSnackbars = [...visibleSnackbars.filter((visible) => visible.key !== key), { ...snackbar, announcedAt: Date.now() }]
  listener?.()
}

// Called when the snackbar starts closing, so that the count does not include snackbars animating out
export const forgetSnackbar = (key: SnackbarKey) => {
  visibleSnackbars = visibleSnackbars.filter((snackbar) => snackbar.key !== key)
  countListener?.(visibleSnackbars.length)
}

/*
 An open MUI modal sets aria-hidden on every other child of body and its dialog has aria-modal,
 so screen readers ignore live regions outside of it. Returns the element the regions must live in:
 the topmost open modal or body.
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

export const SnackbarAnnouncer = () => {
  const { t } = useTranslation()
  const container = useAnnouncerContainer()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [snackbarCount, setSnackbarCount] = useState(0)

  /*
   Notistack does not allow changing its container, so it is labelled directly. When focus moves into a snackbar,
   e.g. to its close button, screen readers then tell that the user is in the notifications and how many there are.
  */
  useEffect(() => {
    countListener = setSnackbarCount
    return () => {
      countListener = null
    }
  }, [])

  useEffect(() => {
    if (!snackbarRegion || snackbarCount === 0) return
    snackbarRegion.setAttribute('role', 'region')
    snackbarRegion.setAttribute('aria-label', t('accessibility:notificationRegion', { count: snackbarCount }))
  }, [snackbarCount, t])

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
        const now = Date.now()
        const newestFirst = visibleSnackbars.filter((snackbar) => now - snackbar.announcedAt < MESSAGE_LIFETIME).reverse()
        if (newestFirst.length === 0) return

        setAnnouncement({
          messages: newestFirst.map((snackbar) => snackbar.message),
          // Errors and warnings must interrupt, also when a less important message arrived right after them
          assertive: newestFirst.some((snackbar) => snackbar.severity !== null),
        })
        clearAnnouncementTimeout = setTimeout(() => setAnnouncement(null), MESSAGE_LIFETIME)
      }, 100)
    }

    return () => {
      listener = null
      clearTimeout(announceTimeout)
      clearTimeout(clearAnnouncementTimeout)
    }
  }, [])

  /*
   A screen reader stops reading a live region when focus moves and reads the focused element instead.
   Remembers whether that happened right after the current announcement was rendered, see the effect on container below.
  */
  const shownAtRef = useRef(0)
  const interruptedRef = useRef(false)

  useEffect(() => {
    shownAtRef.current = announcement ? Date.now() : 0
    interruptedRef.current = false
  }, [announcement])

  useEffect(() => {
    const handleFocusIn = () => {
      if (Date.now() - shownAtRef.current < FOCUS_INTERRUPTS_WITHIN) interruptedRef.current = true
    }
    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  /*
   The regions move when a modal opens or closes, and moving the portal mounts them anew. An announcement already
   rendered in the old container has normally been heard there, e.g. in a closing menu or confirm dialog on top of
   another modal, and repeating it would read it twice. It is announced again in the new container only when it was lost:
   - it was rendered in the same commit as the move, so its text was inserted together with its live region
   - focus moved right after it was rendered, e.g. a dialog that sets focus itself when its closing transition ends
  */
  const previousRef = useRef({ container, announcement })
  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = { container, announcement }
    if (container === previous.container || !announcement) return
    if (announcement !== previous.announcement || interruptedRef.current) listener?.()
  }, [container, announcement])

  const content = announcement && (
    <>
      {announcement.messages.length > 1 && <p>{t('accessibility:notificationCount', { count: announcement.messages.length })}</p>}
      {announcement.messages.map((message, index) => (
        <p key={index}>{message}</p>
      ))}
    </>
  )

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
