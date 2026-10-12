import { visuallyHidden } from '@mui/utils'
import i18next, { t } from 'i18next'
import type { SnackbarKey } from 'notistack'

/*
 Screen readers announce reliably only changes inside a live region that already exists in the DOM.
 Notistack mounts each snackbar (with role="alert") together with its text, which many screen readers
 announce late or not at all. Instead the snackbar text is copied into separate live regions.
*/

// Long enough to be read, short enough that stale messages are not found later with the virtual cursor
const MESSAGE_LIFETIME = 7_000

// A region added to the DOM is not yet known to the screen reader
const REGION_SETTLE_TIME = 100

// Upper limit for waiting a modal to close, see findAnnouncerContainer
const MODAL_CLOSE_WAIT = 1_000

// Covers a modal's opening or closing transition: focus moving to another container this soon after an announcement
// may have cut it off, see handleFocusIn
const INTERRUPTS_WITHIN = 1_000

type VisibleSnackbar = { message: string; assertive: boolean; announcedAt: number }

const visibleSnackbars = new Map<SnackbarKey, VisibleSnackbar>()

// The container notistack renders the snackbars in, labelled as a region with the number of snackbars open
let snackbarRegion: HTMLElement | null = null

let liveRegions: { container: HTMLElement; polite: HTMLElement; assertive: HTMLElement; readyAt: number } | null = null
let announceTimeout: ReturnType<typeof setTimeout> | undefined
let interruptWindowTimeout: ReturnType<typeof setTimeout> | undefined
let lastAnnouncement = ''
// Kept over rescheduled announcements, so that new snackbars do not restart the wait, see findAnnouncerContainer
let modalWaitStartedAt: number | null = null

/*
 An open MUI modal sets aria-hidden on every other child of body and its dialog has aria-modal,
 so screen readers ignore live regions outside of it. Returns the element the regions must live in:
 the topmost open modal or body.
 A closing modal stays in the DOM without aria-hidden until its transition ends, but focus has already returned
 outside of it. A message added there would be read and then lost with the modal, so null is returned to wait for it.
 Only modals portaled directly into body are found, not ones with disablePortal or their own container.
*/
const findAnnouncerContainer = (waited: number) => {
  const openModals = Array.from(document.body.children).filter(
    (element) => element.classList.contains('MuiModal-root') && element.getAttribute('aria-hidden') !== 'true',
  )
  const topModal = openModals.at(-1)
  if (!topModal) return document.body
  if (!topModal.contains(document.activeElement) && waited < MODAL_CLOSE_WAIT) return null

  return topModal.querySelector<HTMLElement>('[aria-modal="true"]') ?? (topModal as HTMLElement)
}

const createLiveRegion = (politeness: 'polite' | 'assertive') => {
  const region = document.createElement('div')
  region.setAttribute('aria-live', politeness)
  region.dataset.testid = `snackbar-announcer-${politeness}`
  Object.assign(region.style, visuallyHidden)
  return region
}

/*
 Every announcement repeats the snackbars announced within MESSAGE_LIFETIME,
 newest first, as a single message. Older ones are left out, snackbars stay visible longer than that and would
 otherwise be repeated over and over.
*/
const announce = () => {
  modalWaitStartedAt ??= Date.now()
  const container = findAnnouncerContainer(Date.now() - modalWaitStartedAt)
  if (!container) {
    announceTimeout = setTimeout(announce, REGION_SETTLE_TIME)
    return
  }

  if (liveRegions?.container !== container || !liveRegions.polite.isConnected) {
    // A new region has not heard the previous text, it needs no change to be announced
    lastAnnouncement = ''
    liveRegions?.polite.remove()
    liveRegions?.assertive.remove()
    liveRegions = {
      container,
      polite: createLiveRegion('polite'),
      assertive: createLiveRegion('assertive'),
      readyAt: Date.now() + REGION_SETTLE_TIME,
    }
    container.append(liveRegions.polite, liveRegions.assertive)
  }
  if (Date.now() < liveRegions.readyAt) {
    announceTimeout = setTimeout(announce, liveRegions.readyAt - Date.now())
    return
  }
  modalWaitStartedAt = null

  const now = Date.now()
  const newestFirst = [...visibleSnackbars.values()].filter((snackbar) => now - snackbar.announcedAt < MESSAGE_LIFETIME).reverse()
  if (newestFirst.length === 0) return

  const messages = newestFirst.map((snackbar) => snackbar.message)
  if (messages.length > 1) messages.unshift(t('accessibility:notificationCount', { count: messages.length }))
  let text = messages.join('. ')
  if (text === lastAnnouncement) text += ' '
  lastAnnouncement = text

  const line = document.createElement('p')
  line.textContent = text
  // Errors and warnings must interrupt, also when a less important message arrived right after them
  const assertive = newestFirst.some((snackbar) => snackbar.assertive)
  liveRegions.polite.replaceChildren()
  liveRegions.assertive.replaceChildren()
  ;(assertive ? liveRegions.assertive : liveRegions.polite).append(line)
  setTimeout(() => line.remove(), MESSAGE_LIFETIME)
  listenForInterruptions()
}

// Snackbars enqueued at the same time end up in the same announcement. The delay also lets a modal closing
// at the same time move focus out of it first.
const scheduleAnnouncement = () => {
  clearTimeout(announceTimeout)
  announceTimeout = setTimeout(announce, REGION_SETTLE_TIME)
}

/*
 A screen reader stops reading a live region when focus moves, and ignores it once an opening modal hides it.
 When focus moves to another container right after an announcement, e.g. into a modal opening or out of a closing one,
 the announcement is repeated there. Focus moving within the same container is left alone, the message was likely heard.
 The check waits a moment, as MUI moves focus and sets aria-hidden in separate effects.
*/
const handleFocusIn = () => {
  setTimeout(() => {
    if (findAnnouncerContainer(0) !== liveRegions?.container) scheduleAnnouncement()
  }, REGION_SETTLE_TIME)
}

const stopListeningForInterruptions = () => {
  clearTimeout(interruptWindowTimeout)
  document.removeEventListener('focusin', handleFocusIn)
}

const listenForInterruptions = () => {
  stopListeningForInterruptions()
  document.addEventListener('focusin', handleFocusIn)
  interruptWindowTimeout = setTimeout(stopListeningForInterruptions, INTERRUPTS_WITHIN)
}

/*
 Notistack does not allow changing its container, so it is labelled directly. When focus moves into a snackbar,
 e.g. to its close button, screen readers then tell that the user is in the notifications and how many there are.
*/
const labelSnackbarRegion = () => {
  if (!snackbarRegion) return
  if (visibleSnackbars.size === 0) {
    snackbarRegion.removeAttribute('role')
    snackbarRegion.removeAttribute('aria-label')
    return
  }
  snackbarRegion.setAttribute('role', 'region')
  snackbarRegion.setAttribute('aria-label', t('accessibility:notificationRegion', { count: visibleSnackbars.size }))
}

i18next.on('languageChanged', labelSnackbarRegion)

// onEnter gets the snackbar's root element, which itself has role="alert" and the variant class
const selfOrDescendant = (node: HTMLElement, selector: string) => (node.matches(selector) ? node : node.querySelector<HTMLElement>(selector))

const isAssertive = (node: HTMLElement) => !!selfOrDescendant(node, '.notistack-MuiContent-error, .notistack-MuiContent-warning')

export const announceSnackbar = (node: HTMLElement, _isAppearing: boolean, key: SnackbarKey) => {
  // StrictMode mounts notistack's transition twice in development, which calls onEnter again with the same key
  if (visibleSnackbars.has(key)) return

  const message = node.querySelector('#notistack-snackbar')?.textContent?.trim()
  if (!message) return

  // The live regions do the announcing, prevent the snackbar itself from being read a second time
  selfOrDescendant(node, '[role="alert"]')?.removeAttribute('role')
  snackbarRegion = node.closest<HTMLElement>('.notistack-SnackbarContainer')

  visibleSnackbars.set(key, { message, assertive: isAssertive(node), announcedAt: Date.now() })
  labelSnackbarRegion()
  scheduleAnnouncement()
}

// Called when the user causes a message that is already visible: it is not shown twice but must be heard again
export const reannounceSnackbar = (key: SnackbarKey) => {
  const snackbar = visibleSnackbars.get(key)
  if (!snackbar) return

  // Moved last, so that it is the newest
  visibleSnackbars.delete(key)
  visibleSnackbars.set(key, { ...snackbar, announcedAt: Date.now() })
  scheduleAnnouncement()
}

// Called when the snackbar starts closing, so that the count does not include snackbars animating out
export const forgetSnackbar = (key?: SnackbarKey) => {
  if (key === undefined) visibleSnackbars.clear()
  else visibleSnackbars.delete(key)
  labelSnackbarRegion()
}
