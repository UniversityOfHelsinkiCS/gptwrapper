import Close from '@mui/icons-material/Close'
import { Box, Button, IconButton, styled, useMediaQuery, type Theme } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import {
  MaterialDesignContent,
  closeSnackbar,
  enqueueSnackbar as enqueueNotistackSnackbar,
  type CloseReason,
  type CustomContentProps,
  type OptionsObject,
  type SnackbarKey,
  type VariantType,
} from 'notistack'
import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { forgetSnackbar, reannounceSnackbar } from './accessibility/SnackbarAnnouncer'
import { SNACKBAR_CONTAINER, findFocusAfterClose, rememberFocusOutsideSnackbars } from './accessibility/SnackbarFocus'
import { SHORT_VIEWPORT } from '../../theme'

export const MAX_SNACKBARS = 4

export const useCompactSnackbars = () => {
  const narrow = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const short = useMediaQuery(SHORT_VIEWPORT.replace('@media ', ''))
  return narrow || short
}

const AUTO_HIDE_DURATION = 20_000

const openSnackbars = new Map<string, SnackbarKey>()

// How many times each open snackbar has been shown again, a change starts its auto hide timer from the beginning
const autoHideRestarts = new Map<SnackbarKey, number>()
const restartListeners = new Set<() => void>()

const subscribeToAutoHideRestarts = (listener: () => void) => {
  restartListeners.add(listener)
  return () => {
    restartListeners.delete(listener)
  }
}

const restartAutoHide = (key: SnackbarKey) => {
  autoHideRestarts.set(key, (autoHideRestarts.get(key) ?? 0) + 1)
  restartListeners.forEach((listener) => listener())
}

/*
 Use this instead of enqueueSnackbar from notistack.
 Snackbars close after AUTO_HIDE_DURATION, see useAutoHide. Notistack's own timer is turned off with autoHideDuration null.
 A message that is already open is not shown twice, but it is announced again so that a screen reader user
 knows the action caused it again, and its timer starts from the beginning. Duplicates are handled here instead of
 notistack's preventDuplicate, which silently drops them, also while the previous one is still animating out.
*/
export const enqueueSnackbar = (message: string, options: OptionsObject = {}) => {
  const duplicateKey = `${options.variant ?? 'default'}:${message}`
  const openKey = openSnackbars.get(duplicateKey)
  if (openKey !== undefined) {
    reannounceSnackbar(openKey)
    restartAutoHide(openKey)
    return openKey
  }

  const key = enqueueNotistackSnackbar(message, { ...options, autoHideDuration: null })
  openSnackbars.set(duplicateKey, key)
  return key
}

// Without a key notistack is closing all snackbars
export const forgetClosedSnackbar = (_event: SyntheticEvent | null, _reason: CloseReason, key?: SnackbarKey) => {
  for (const [duplicateKey, openKey] of openSnackbars) {
    if (key === undefined || openKey === key) openSnackbars.delete(duplicateKey)
  }
  if (key === undefined) autoHideRestarts.clear()
  else autoHideRestarts.delete(key)
  forgetSnackbar(key)
  if (openSnackbars.size === 0) setSnackbarPlacement('top')
}

type SnackbarPlacement = 'top' | 'bottom'

const getSnackbarPlacement = (): SnackbarPlacement => (document.documentElement.dataset.snackbarPlacement === 'bottom' ? 'bottom' : 'top')

const setSnackbarPlacement = (placement: SnackbarPlacement) => {
  if (placement === 'bottom') document.documentElement.dataset.snackbarPlacement = 'bottom'
  else delete document.documentElement.dataset.snackbarPlacement
}

/*
 Notistack pauses its timer only while the mouse is over a snackbar, so a snackbar could disappear while a keyboard
 or screen reader user is reading it or has focus on its close button. Instead no snackbar closes while focus or
 the mouse is in the notification region, so that the region does not change under the user, nor while the window
 is not focused. The container has pointer-events none, so only the snackbars themselves are hovered.
*/
const pauseListeners = new Set<() => void>()

const notifyPauseListeners = () => pauseListeners.forEach((listener) => listener())

const handleDocumentEvent = (event: Event) => {
  if (event.type === 'focusin') rememberFocusOutsideSnackbars(event.target)
  notifyPauseListeners()
}

const documentEvents = ['focusin', 'focusout', 'mouseover', 'mouseout'] as const
const windowEvents = ['focus', 'blur'] as const

const subscribeToAutoHidePause = (listener: () => void) => {
  if (pauseListeners.size === 0) {
    rememberFocusOutsideSnackbars(document.activeElement)
    documentEvents.forEach((type) => document.addEventListener(type, handleDocumentEvent))
    windowEvents.forEach((type) => window.addEventListener(type, notifyPauseListeners))
  }
  pauseListeners.add(listener)

  return () => {
    pauseListeners.delete(listener)
    if (pauseListeners.size > 0) return
    documentEvents.forEach((type) => document.removeEventListener(type, handleDocumentEvent))
    windowEvents.forEach((type) => window.removeEventListener(type, notifyPauseListeners))
  }
}

const isAutoHidePaused = () =>
  !document.hasFocus() || !!document.activeElement?.closest(SNACKBAR_CONTAINER) || !!document.querySelector(`${SNACKBAR_CONTAINER} :hover`)

const useAutoHide = (id: SnackbarKey, persist: boolean) => {
  const paused = useSyncExternalStore(subscribeToAutoHidePause, isAutoHidePaused)
  const restarts = useSyncExternalStore(subscribeToAutoHideRestarts, () => autoHideRestarts.get(id) ?? 0)
  const wasPausedRef = useRef(false)

  // Shown again, so it gets the full time. Runs before the timer effect below.
  useEffect(() => {
    wasPausedRef.current = false
  }, [restarts])

  useEffect(() => {
    if (persist) return
    if (paused) {
      wasPausedRef.current = true
      return
    }
    // Like notistack, a paused snackbar gets half of the time when the user leaves
    const timeout = setTimeout(() => closeSnackbar(id), wasPausedRef.current ? AUTO_HIDE_DURATION / 2 : AUTO_HIDE_DURATION)
    return () => clearTimeout(timeout)
  }, [id, persist, paused, restarts])

  // A focused close button removed from the DOM does not fire focusout in every browser, the others would stay paused
  useEffect(() => () => notifyPauseListeners(), [])
}

const isOpen = (key: string | undefined) => [...openSnackbars.values()].some((openKey) => String(openKey) === key)

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/*
 Snackbars float over the page, at the top right corner on large screens. When keyboard focus moves to an element
 under a snackbar, the snackbars move to the bottom of the viewport, and back to the top when focus moves under them
 there (WCAG 2.4.11). 
*/
const moveSnackbarsAwayFromFocus = (event: FocusEvent) => {
  const target = event.target
  if (!(target instanceof HTMLElement) || target.closest(SNACKBAR_CONTAINER) || openSnackbars.size === 0) return
  if (!target.matches(':focus-visible')) return

  requestAnimationFrame(() => {
    if (document.activeElement !== target) return
    const targetRect = target.getBoundingClientRect()
    const snackbars = document.querySelectorAll(`${SNACKBAR_CONTAINER} .notistack-MuiContent`)
    const covered = Array.from(snackbars).some((snackbar) => overlaps(snackbar.getBoundingClientRect(), targetRect))
    if (covered) setSnackbarPlacement(getSnackbarPlacement() === 'top' ? 'bottom' : 'top')
  })
}

export const useMoveSnackbarsAwayFromFocus = () => {
  useEffect(() => {
    document.addEventListener('focusin', moveSnackbarsAwayFromFocus)
    return () => {
      document.removeEventListener('focusin', moveSnackbarsAwayFromFocus)
      setSnackbarPlacement('top')
    }
  }, [])
}

/*
 Sets --snackbar-cover-top or --snackbar-cover-bottom to how far the open snackbars reach from that edge of the
 viewport, depending on where they are, and the other one to 0px. GlobalStyles.tsx uses them as scroll-padding, so that
 the browser scrolls a focused element clear of the snackbars instead of under them (WCAG 2.4.11).
 Notistack adds and removes the container element, so it is looked up again whenever the root's children change.
*/
export const useSnackbarCoverVariables = (root: HTMLElement | null) => {
  useEffect(() => {
    if (!root || typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return
    const rootStyle = document.documentElement.style
    let observed: Element | null = null

    const update = () => {
      const container = root.querySelector(SNACKBAR_CONTAINER)
      if (container !== observed) {
        if (observed) resizeObserver.unobserve(observed)
        if (container) resizeObserver.observe(container)
        observed = container
      }
      const rect = container && container.childElementCount > 0 ? container.getBoundingClientRect() : null
      const atBottom = getSnackbarPlacement() === 'bottom'
      const coverTop = rect && !atBottom ? Math.ceil(rect.bottom) : 0
      const coverBottom = rect && atBottom ? Math.ceil(window.innerHeight - rect.top) : 0
      rootStyle.setProperty('--snackbar-cover-top', `${Math.max(0, coverTop)}px`)
      rootStyle.setProperty('--snackbar-cover-bottom', `${Math.max(0, coverBottom)}px`)
    }

    // The bottom distance depends on the viewport height
    let frame = 0
    const scheduleUpdate = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          update()
        })
    }

    const resizeObserver = new ResizeObserver(update)
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(root, { childList: true, subtree: true })
    // The snackbars move between the top and the bottom
    const placementObserver = new MutationObserver(update)
    placementObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-snackbar-placement'] })
    window.addEventListener('resize', scheduleUpdate)
    update()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      placementObserver.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      cancelAnimationFrame(frame)
      rootStyle.removeProperty('--snackbar-cover-top')
      rootStyle.removeProperty('--snackbar-cover-bottom')
    }
  }, [root])
}

const SnackbarCloseButton = ({ snackbarId, messageId }: { snackbarId: SnackbarKey; messageId: string }) => {
  const { t } = useTranslation()

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const closeButton = event.currentTarget
    const focusAfterClose = document.activeElement === closeButton ? findFocusAfterClose(closeButton, isOpen) : null
    closeSnackbar(snackbarId)
    focusAfterClose?.focus()
  }

  return (
    <IconButton
      aria-label={t('accessibility:closeNotification')}
      aria-describedby={messageId}
      data-snackbar-close={String(snackbarId)}
      color="inherit"
      size="small"
      onClick={handleClick}
    >
      <Close fontSize="small" />
    </IconButton>
  )
}

const DEFAULT_BACKGROUND = '#79719D'

const StyledSnackbarContent = styled(MaterialDesignContent)(({ theme, variant }) => {
  const backgroundColors: Record<VariantType, string> = {
    default: DEFAULT_BACKGROUND,
    success: theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.main,
    error: theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main,
  }

  return {
    '&.notistack-MuiContent': {
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      flexWrap: 'nowrap',
      fontSize: '0.8125rem',
      padding: '2px 16px',
      color: 'white',
      backgroundColor: backgroundColors[variant] ?? DEFAULT_BACKGROUND,
    },
    '& #notistack-snackbar': {
      padding: '6px 0',
      flex: 1,
      minWidth: 0,
      overflowWrap: 'anywhere',
    },
    '& #notistack-snackbar + div': {
      flexShrink: 0,
    },
  }
})

const SnackbarContent = forwardRef<HTMLDivElement, CustomContentProps>(({ id, message, variant, ...props }, ref) => {
  const { t } = useTranslation()
  const messageId = useId()
  useAutoHide(id, props.persist)
  const compact = useCompactSnackbars()
  const textRef = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)

  useLayoutEffect(() => {
    const node = textRef.current
    if (!compact || expanded || !node) return
    const measure = () => setTruncated(node.scrollHeight > node.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [compact, expanded, message])

  const clamped = compact && !expanded
  const showToggle = compact && (expanded || truncated)

  let severityLabel: string | null = null
  if (variant === 'error') severityLabel = t('accessibility:errorNotification')
  if (variant === 'warning') severityLabel = t('accessibility:warningNotification')

  return (
    <StyledSnackbarContent
      ref={ref}
      {...props}
      id={id}
      variant={variant}
      message={
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <Box
            component="span"
            id={messageId}
            ref={textRef}
            data-snackbar-message
            sx={clamped ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
          >
            {severityLabel && <Box component="span" sx={visuallyHidden}>{`${severityLabel}: `}</Box>}
            {message}
          </Box>
          {showToggle && (
            <Button
              variant="text"
              color="inherit"
              size="small"
              aria-expanded={expanded}
              aria-controls={messageId}
              onClick={() => setExpanded(!expanded)}
              sx={{ p: 0, minWidth: 0, mt: 0.5, fontSize: 'inherit', textTransform: 'none', textDecoration: 'underline' }}
            >
              {expanded ? t('chat:showLessDescription') : t('accessibility:showFullNotification')}
            </Button>
          )}
        </Box>
      }
      action={<SnackbarCloseButton snackbarId={id} messageId={messageId} />}
    />
  )
})

export const snackbarComponents = {
  default: SnackbarContent,
  success: SnackbarContent,
  error: SnackbarContent,
  warning: SnackbarContent,
  info: SnackbarContent,
}
