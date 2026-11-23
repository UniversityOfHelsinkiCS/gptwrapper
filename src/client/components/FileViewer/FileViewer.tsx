import Close from '@mui/icons-material/Close'
import { Box, Button, IconButton, LinearProgress, Paper, Tooltip, Typography } from '@mui/material'
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { darkModeLinkColors } from '../../theme'
import { focusIndicatorStyle } from '../../util/accessibility'
import { baseName } from '../../util/myFiles/paths'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MarkdownContent } from '../ChatV2/MarkdownContent'
import { ExperimentalChip } from '../MyFiles/ExperimentalChip'
import { MAX_VIEWER_TEXT_BYTES, viewerFileKind } from './fileKind'
import type { ViewerTarget } from './FileViewerContext'
import { selectionToQuote, type PendingQuote } from './selectionQuote'

type Content =
  | { state: 'loading' }
  | { state: 'ready'; text: string }
  | { state: 'missing' }
  | { state: 'tooLarge' }
  | { state: 'error' }
  | { state: 'unsupported' }

/** Reads the target file from the store, again whenever the path changes. */
const useFileText = (store: MyFilesStore, path: string): Content => {
  const [content, setContent] = useState<Content>({ state: 'loading' })
  useEffect(() => {
    let cancelled = false
    setContent({ state: 'loading' })
    void (async () => {
      try {
        const entry = await store.stat(path)
        let next: Content
        if (!entry || entry.kind !== 'file') next = { state: 'missing' }
        else if (!viewerFileKind(path)) next = { state: 'unsupported' }
        else if (entry.size > MAX_VIEWER_TEXT_BYTES) next = { state: 'tooLarge' }
        else next = { state: 'ready', text: await store.readText(path) }
        if (!cancelled) setContent(next)
      } catch {
        if (!cancelled) setContent({ state: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [store, path])
  return content
}

/** Keeps a click on a selection action from collapsing the selection it acts on. */
const keepSelection = (event: MouseEvent) => event.preventDefault()

/** Where the floating selection toolbar goes, relative to the content box: just below the end of the selection. */
const floatingPosition = (selection: Selection, content: HTMLElement): { top: number; left: number } => {
  const range = selection.getRangeAt(0)
  const rects = range.getClientRects?.()
  const end = rects && rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect?.()
  const base = content.getBoundingClientRect()
  if (!end) return { top: 0, left: 0 }
  return { top: end.bottom - base.top + 6, left: Math.max(0, Math.min(end.right - base.left, base.width - 120)) }
}

/**
 * Tracks the selection in the file content as a quote, and where to show the floating toolbar for it (after a mouse
 * selection). The toolbar hides when the selection collapses or leaves the content, on scroll and on Escape.
 */
const useSelectionQuote = (contentRef: RefObject<HTMLElement | null>, path: string) => {
  const [selected, setSelected] = useState<PendingQuote | null>(null)
  const [floating, setFloating] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const onSelectionChange = () => {
      const content = contentRef.current
      const next = content ? selectionToQuote(document.getSelection(), content, path) : null
      setSelected(next)
      if (!next) setFloating(null)
    }
    onSelectionChange()
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [contentRef, path])

  const onMouseUp = useCallback(() => {
    const content = contentRef.current
    const selection = document.getSelection()
    const next = content ? selectionToQuote(selection, content, path) : null
    setSelected(next)
    setFloating(next && selection && content ? floatingPosition(selection, content) : null)
  }, [contentRef, path])

  const hideFloating = useCallback(() => setFloating(null), [])

  return { selected, floating, onMouseUp, hideFloating }
}

/**
 * A My files file shown next to the chat: Markdown rendered like chat answers (without loading images), text in a
 * wrapping monospace block. The whole panel is one labelled, focusable region that scrolls under a sticky toolbar.
 * With `onAddQuote`, selected text can be added to the chat as a quote ("Ask…"), from a toolbar floating next to a
 * mouse selection or from the viewer toolbar (the keyboard and screen reader path).
 */
const FileViewer = ({
  store,
  target,
  onClose,
  onAddQuote,
}: {
  store: MyFilesStore
  target: ViewerTarget
  onClose: () => void
  onAddQuote?: (pending: PendingQuote) => void
}) => {
  const { t } = useTranslation()
  const titleId = useId()
  const regionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { selected, floating, onMouseUp, hideFloating } = useSelectionQuote(contentRef, target.path)
  const name = baseName(target.path)
  const kind = viewerFileKind(target.path)
  const content = useFileText(store, target.path)
  const params = { name, interpolation: { escapeValue: false } }

  // Opening a file moves focus to it, so keyboard and screen reader users land in the viewer.
  useEffect(() => {
    regionRef.current?.focus({ preventScroll: true })
    regionRef.current?.scrollTo?.({ top: 0 })
  }, [target.path])

  const ask = () => {
    if (!selected || !onAddQuote) return
    hideFloating()
    onAddQuote(selected)
  }

  const message = (text: string, error = false) => (
    <Typography color={error ? 'error' : 'text.secondary'} sx={{ p: 2 }} data-testid="file-viewer-message">
      {text}
    </Typography>
  )

  return (
    <Box
      component="section"
      ref={regionRef}
      aria-labelledby={titleId}
      tabIndex={0}
      data-testid="file-viewer"
      data-path={target.path}
      onScroll={floating ? hideFloating : undefined}
      onKeyDown={floating ? (event) => event.key === 'Escape' && hideFloating() : undefined}
      sx={{ height: '100%', overflow: 'auto', bgcolor: 'background.paper', ...focusIndicatorStyle() }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title={target.path} describeChild>
          <Typography id={titleId} component="h2" variant="subtitle1" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
            {name}
          </Typography>
        </Tooltip>
        <ExperimentalChip sx={{ ml: 0, flexShrink: 0 }} />
        {onAddQuote && (
          <Button
            size="small"
            variant="outlined"
            disabled={!selected}
            onMouseDown={keepSelection}
            onClick={ask}
            data-testid="file-viewer-ask"
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            {t('fileViewer:ask')}
          </Button>
        )}
        <IconButton onClick={onClose} aria-label={t('fileViewer:closeNamed', params)} data-testid="file-viewer-close" sx={{ ml: onAddQuote ? 0 : 'auto' }}>
          <Close />
        </IconButton>
      </Box>
      <Box ref={contentRef} onMouseUp={onAddQuote ? onMouseUp : undefined} sx={{ px: 3, py: 2, position: 'relative' }}>
        {content.state === 'loading' && <LinearProgress aria-label={t('common:loading')} />}
        {content.state === 'missing' && message(t('myFiles:fileMissing', params), true)}
        {content.state === 'tooLarge' && message(t('fileViewer:tooLarge'))}
        {content.state === 'unsupported' && message(t('fileViewer:unsupported'))}
        {content.state === 'error' && message(t('myFiles:error'), true)}
        {content.state === 'ready' &&
          (kind === 'markdown' ? (
            <Box data-testid="file-viewer-markdown" sx={(theme) => ({ wordBreak: 'break-word', ...theme.applyStyles('dark', darkModeLinkColors) })}>
              <MarkdownContent text={content.text} source="file" />
            </Box>
          ) : (
            <Box
              component="pre"
              data-testid="file-viewer-text"
              sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.9rem' }}
            >
              {content.text}
            </Box>
          ))}
        {/* Inside the region, not portalled to the body, so it stays in the landmark. */}
        {onAddQuote && floating && selected && (
          <Paper
            role="toolbar"
            aria-label={t('fileViewer:selectionActions')}
            elevation={4}
            data-testid="file-viewer-selection-toolbar"
            sx={{ position: 'absolute', top: floating.top, left: floating.left, zIndex: 2, p: 0.5, userSelect: 'none' }}
          >
            <Button size="small" onMouseDown={keepSelection} onClick={ask} data-testid="file-viewer-selection-ask">
              {t('fileViewer:ask')}
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  )
}

export default FileViewer
