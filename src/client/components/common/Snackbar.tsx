import Close from '@mui/icons-material/Close'
import { Box, IconButton, styled } from '@mui/material'
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
import { forwardRef, useEffect, useId, useRef, useSyncExternalStore, type MouseEvent, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { forgetSnackbar, reannounceSnackbar } from './accessibility/SnackbarAnnouncer'
import { SNACKBAR_CONTAINER, findFocusAfterClose, rememberFocusOutsideSnackbars } from './accessibility/SnackbarFocus'

export const MAX_SNACKBARS = 4

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

const FixedWidthContent = styled(MaterialDesignContent)(({ theme, variant }) => {
  const backgroundColors: Record<VariantType, string> = {
    default: theme.palette.secondary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: '#cb510ae4',
    info: theme.palette.primary.main,
  }

  return {
    '&.notistack-MuiContent': {
      width: 400,
      maxWidth: '100%',
      flexWrap: 'nowrap',
      color: 'white',
      backgroundColor: backgroundColors[variant] ?? theme.palette.secondary.main,
    },
    '& #notistack-snackbar': {
      flex: 1,
      minWidth: 0,
      overflowWrap: 'anywhere',
    },
  }
})

/*
 The type of an error or warning is otherwise shown only with color and icon, so it is written out for screen readers.
 It is part of the message text, so it is also heard in the live announcement and with the virtual cursor.
 The close button is described by the message: focusing it tells which notification it closes.
 Notistack gives every message the same id, so a unique one is needed for that.
*/
const SnackbarContent = forwardRef<HTMLDivElement, CustomContentProps>(({ id, message, variant, ...props }, ref) => {
  const { t } = useTranslation()
  const messageId = useId()
  useAutoHide(id, props.persist)

  let severityLabel: string | null = null
  if (variant === 'error') severityLabel = t('accessibility:errorNotification')
  if (variant === 'warning') severityLabel = t('accessibility:warningNotification')

  return (
    <FixedWidthContent
      ref={ref}
      {...props}
      id={id}
      variant={variant}
      message={
        <span id={messageId}>
          {severityLabel && <Box component="span" sx={visuallyHidden}>{`${severityLabel}: `}</Box>}
          {message}
        </span>
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
