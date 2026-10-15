import type { Theme } from '@mui/material'
import type { SystemStyleObject } from '@mui/system'
import { focusIndicator } from '../theme'

export const focusIndicatorStyle = ({ color }: { color?: string } = {}): SystemStyleObject<Theme> => ({
  '&.Mui-focusVisible': {
    outline: '3px solid',
    outlineColor: color ?? focusIndicator,
    outlineOffset: '-3px',
    backgroundColor: 'transparent',
  },
})

export const optionFocusIndicatorStyle = ({ color }: { color?: string } = {}): SystemStyleObject<Theme> => ({
  display: 'inline-flex',
  maxWidth: 'fit-content',
  alignItems: 'center',
  borderRadius: 1,
  '&:has(:focus-visible)': {
    outline: '3px solid',
    outlineColor: (theme) => color ?? theme.palette.primary.main,
    outlineOffset: '3px',
  },
})

export const switchFocusIndicatorStyle: SystemStyleObject<Theme> = {
  '& .MuiSwitch-switchBase.Mui-focusVisible .MuiSwitch-thumb': {
    outline: '3px solid',
    outlineColor: focusIndicator,
    outlineOffset: '2px',
  },
}

const PENDING_FOCUS_STORAGE_KEY = 'pendingFocusTargetId'

// Some navigations (e.g. a stale-deploy chunk reload, or a route guard swapping the whole
// subtree) can tear down the DOM before an in-memory focus() call would run. Persisting the
// target id survives that and lets the remounted page pick up where the interaction left off.
export const requestFocusAfterNavigate = (elementId: string) => {
  sessionStorage.setItem(PENDING_FOCUS_STORAGE_KEY, elementId)
}

const FOCUS_SETTLE_TIME = 100

const isHiddenFromScreenReaders = (element: HTMLElement) => !!element.closest('[aria-hidden="true"], [inert]')

export const consumePendingFocusTarget = (): boolean => {
  const pendingId = sessionStorage.getItem(PENDING_FOCUS_STORAGE_KEY)
  if (!pendingId) return false

  const target = document.getElementById(pendingId)
  if (!target) return false

  // Behind an open modal (MUI marks the rest of the page aria-hidden): keep the request pending
  // until it closes, otherwise the modal's focus trap swallows it.
  if (isHiddenFromScreenReaders(target)) return false

  sessionStorage.removeItem(PENDING_FOCUS_STORAGE_KEY)
  const focusedBefore = document.activeElement
  setTimeout(() => {
    if (document.activeElement !== focusedBefore && document.activeElement !== document.body) return
    if (target.isConnected && !isHiddenFromScreenReaders(target)) target.focus()
  }, FOCUS_SETTLE_TIME)
  return true
}
