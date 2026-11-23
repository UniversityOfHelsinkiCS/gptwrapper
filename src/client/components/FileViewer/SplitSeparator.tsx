import { Box } from '@mui/material'
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import safeLocalStorage from '../../util/safeLocalStorage'
import { focusIndicatorStyle } from '../../util/accessibility'

/** The chat's share of the split between the chat and the file viewer. */
export const DEFAULT_SPLIT = 0.4
export const MIN_SPLIT = 0.2
export const MAX_SPLIT = 0.75
/** The chat stays at least about this wide, whatever the ratio. */
export const MIN_CHAT_WIDTH = 360
/** How much one arrow key press moves the separator. */
export const SPLIT_STEP = 0.05

const STORAGE_KEY = 'file-viewer-split'

/** Keeps a ratio inside the allowed range, and the chat at least `MIN_CHAT_WIDTH` wide when the total width is known. */
export const clampSplit = (ratio: number, totalWidth?: number) => {
  const min = totalWidth && totalWidth > 0 ? Math.max(MIN_SPLIT, Math.min(MIN_CHAT_WIDTH / totalWidth, MAX_SPLIT)) : MIN_SPLIT
  return Math.min(MAX_SPLIT, Math.max(min, ratio))
}

/** The ratio after a key press on the separator, or null for keys it does not handle. */
export const splitAfterKey = (key: string, ratio: number, totalWidth?: number): number | null => {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampSplit(ratio - SPLIT_STEP, totalWidth)
    case 'ArrowRight':
    case 'ArrowUp':
      return clampSplit(ratio + SPLIT_STEP, totalWidth)
    case 'Home':
      return clampSplit(MIN_SPLIT, totalWidth)
    case 'End':
      return clampSplit(MAX_SPLIT, totalWidth)
    default:
      return null
  }
}

const readStoredSplit = () => {
  const stored = Number.parseFloat(safeLocalStorage.getItem(STORAGE_KEY) ?? '')
  return Number.isFinite(stored) ? clampSplit(stored) : DEFAULT_SPLIT
}

/** The chat's share of the split, remembered across visits. */
export const useSplitRatio = () => {
  const [ratio, setRatio] = useState(readStoredSplit)
  const update = useCallback((next: number) => {
    setRatio(next)
    safeLocalStorage.setItem(STORAGE_KEY, String(Math.round(next * 1000) / 1000))
  }, [])
  return [ratio, update] as const
}

/** Where the split area starts and ends on the screen, in px. */
export type SplitRange = { start: number; end: number }

/**
 * The handle between the chat and the file viewer: an accessible separator that is dragged with the mouse (or a pen or
 * finger) or moved with the arrow keys, Home and End. `value` is the chat's share of `getRange()`.
 */
const SplitSeparator = ({
  value,
  onChange,
  getRange,
  controls,
}: {
  value: number
  onChange: (value: number) => void
  getRange: () => SplitRange | null
  /** The id of the chat column it resizes. */
  controls?: string
}) => {
  const { t } = useTranslation()
  const dragging = useRef(false)
  const percent = Math.round(value * 100)

  const totalWidth = () => {
    const range = getRange()
    return range ? range.end - range.start : undefined
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const next = splitAfterKey(event.key, value, totalWidth())
    if (next === null) return
    event.preventDefault()
    onChange(next)
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging.current) return
    const range = getRange()
    if (!range || range.end <= range.start) return
    const total = range.end - range.start
    onChange(clampSplit((event.clientX - range.start) / total, total))
  }

  const stopDragging = (event: PointerEvent<HTMLElement>) => {
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    // An <hr> rather than a <div>: axe's experimental focus-order-semantics rule flags a focusable div even with a
    // separator role, although a focusable separator is the ARIA window splitter pattern.
    <Box
      component="hr"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={t('fileViewer:resizeSplit')}
      aria-valuenow={percent}
      aria-valuemin={Math.round(MIN_SPLIT * 100)}
      aria-valuemax={Math.round(MAX_SPLIT * 100)}
      aria-valuetext={t('fileViewer:splitValue', { percent })}
      aria-controls={controls}
      data-testid="file-viewer-separator"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      sx={{
        flex: '0 0 auto',
        m: 0,
        border: 0,
        width: '9px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        cursor: 'col-resize',
        touchAction: 'none',
        display: 'flex',
        justifyContent: 'center',
        // A thin line in a wider grab area, thicker while hovered or dragged.
        '&::before': { content: '""', width: '1px', height: '100%', bgcolor: 'divider', transition: 'width 0.1s' },
        '&:hover::before, &:active::before': { width: '3px', bgcolor: 'primary.main' },
        ...focusIndicatorStyle({ selector: '&:focus-visible' }),
      }}
    />
  )
}

export default SplitSeparator
