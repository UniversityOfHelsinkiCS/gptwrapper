import Add from '@mui/icons-material/Add'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Close from '@mui/icons-material/Close'
import FitScreen from '@mui/icons-material/FitScreen'
import Remove from '@mui/icons-material/Remove'
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
import { findHeading, pdfPageOf, selectionToQuote, type AddQuoteOptions, type PendingQuote } from './selectionQuote'
import { usePdfViewer } from './usePdfViewer'
import { readingPositionKey, readReadingPosition, writeReadingPosition } from './viewerPersistence'
import { PDF_VIEWER_SCOPE_CLASS } from '../../util/pdfjs'

type Content =
  | { state: 'loading' }
  /** `path`, `size` and `lastModified` identify the file version read, for its reading position. */
  | { state: 'ready'; text: string; path: string; size: number; lastModified: number }
  | { state: 'missing' }
  | { state: 'tooLarge' }
  | { state: 'error' }
  | { state: 'unsupported' }

/** Reads the target file from the store, again whenever the path changes. PDFs are read by `usePdfViewer` instead. */
const useFileText = (store: MyFilesStore, path: string, enabled: boolean): Content => {
  const [content, setContent] = useState<Content>({ state: 'loading' })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setContent({ state: 'loading' })
    void (async () => {
      try {
        const entry = await store.stat(path)
        let next: Content
        if (!entry || entry.kind !== 'file') next = { state: 'missing' }
        else if (!viewerFileKind(path)) next = { state: 'unsupported' }
        else if (entry.size > MAX_VIEWER_TEXT_BYTES) next = { state: 'tooLarge' }
        else next = { state: 'ready', text: await store.readText(path), path, size: entry.size, lastModified: entry.lastModified }
        if (!cancelled) setContent(next)
      } catch {
        if (!cancelled) setContent({ state: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [store, path, enabled])
  return content
}

/** How long scrolling has to pause before a Markdown or text file's reading position is saved. */
const SAVE_SCROLL_DELAY_MS = 250

/** How far down (0–1) an element is scrolled. */
const scrollFraction = (element: HTMLElement) => {
  const max = element.scrollHeight - element.clientHeight
  return max > 0 ? Math.min(1, Math.max(0, element.scrollTop / max)) : 0
}

/** The selection actions: the quick actions send the quote right away with a fixed message, "Ask…" waits for a question. */
const SELECTION_ACTIONS = ['explain', 'summarize', 'translate', 'ask'] as const
type SelectionAction = (typeof SELECTION_ACTIONS)[number]

/** Keeps a click on a selection action from collapsing the selection it acts on. */
const keepSelection = (event: MouseEvent) => event.preventDefault()

/** About how wide the floating toolbar is with its four actions, to keep it inside the content box. */
const FLOATING_TOOLBAR_WIDTH = 360

/** Where the floating selection toolbar goes, relative to the content box: just below the end of the selection. */
const floatingPosition = (selection: Selection, content: HTMLElement): { top: number; left: number } => {
  const range = selection.getRangeAt(0)
  const rects = range.getClientRects?.()
  const end = rects && rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect?.()
  const base = content.getBoundingClientRect()
  if (!end) return { top: 0, left: 0 }
  // Kept inside the content box, which for a PDF is the visible area of its scroll container.
  return {
    top: Math.max(0, Math.min(end.bottom - base.top + 6, base.height - 48)),
    left: Math.max(0, Math.min(end.right - base.left, base.width - FLOATING_TOOLBAR_WIDTH)),
  }
}

/**
 * Tracks the selection in the file content as a quote, and where to show the floating toolbar for it (after a mouse
 * selection). The toolbar hides when the selection collapses or leaves the content, on scroll and on Escape. `pageOf`
 * gives a PDF quote its page.
 */
const useSelectionQuote = (contentRef: RefObject<HTMLElement | null>, path: string, pageOf?: (node: Node) => number | undefined) => {
  const [selected, setSelected] = useState<PendingQuote | null>(null)
  const [floating, setFloating] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const onSelectionChange = () => {
      const content = contentRef.current
      const next = content ? selectionToQuote(document.getSelection(), content, path, { pageOf }) : null
      setSelected(next)
      if (!next) setFloating(null)
    }
    onSelectionChange()
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [contentRef, path, pageOf])

  const onMouseUp = useCallback(() => {
    const content = contentRef.current
    const selection = document.getSelection()
    const next = content ? selectionToQuote(selection, content, path, { pageOf }) : null
    setSelected(next)
    setFloating(next && selection && content ? floatingPosition(selection, content) : null)
  }, [contentRef, path, pageOf])

  const hideFloating = useCallback(() => setFloating(null), [])

  return { selected, floating, onMouseUp, hideFloating }
}

/**
 * A My files file shown next to the chat: Markdown rendered like chat answers (without loading images), text in a
 * wrapping monospace block, PDFs in pdf.js's viewer (with page and zoom controls in the toolbar). The whole panel is one
 * labelled, focusable region; it scrolls under a sticky toolbar, except a PDF, which scrolls in its own container.
 * `target.page` opens a PDF at that page and `target.heading` scrolls Markdown to that heading, also when the same file
 * is opened again with another one. Without them, the file opens at its remembered reading position (the PDF page or
 * how far down it was scrolled), which is saved per file version: a replaced file starts at the top.
 * With `onAddQuote`, selected text can be added to the chat as a quote ("Ask…") or sent right away with a fixed
 * message (Explain, Summarize, Translate; disabled with `quickActionsDisabled`, while a response streams), from a
 * toolbar floating next to a mouse selection (unless `floatingToolbar` is false: narrow screens and touch, which use
 * native selection) or from the viewer toolbar (the keyboard, screen reader and touch path).
 * `onBackToChat` is given in narrow mode, where the viewer covers the chat: it adds a "Back to chat" button and leaves
 * room at the top right for the global menu, which floats over the viewer there.
 */
const FileViewer = ({
  store,
  target,
  onClose,
  onAddQuote,
  quickActionsDisabled = false,
  floatingToolbar = true,
  onBackToChat,
}: {
  store: MyFilesStore
  target: ViewerTarget
  onClose: () => void
  onAddQuote?: (pending: PendingQuote, options?: AddQuoteOptions) => void
  quickActionsDisabled?: boolean
  floatingToolbar?: boolean
  onBackToChat?: () => void
}) => {
  const { t } = useTranslation()
  const titleId = useId()
  const regionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const name = baseName(target.path)
  const kind = viewerFileKind(target.path)
  const isPdf = kind === 'pdf'
  const { selected, floating, onMouseUp, hideFloating } = useSelectionQuote(contentRef, target.path, isPdf ? pdfPageOf : undefined)
  const content = useFileText(store, target.path, !isPdf)
  const params = { name, interpolation: { escapeValue: false } }
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const pdfViewerRef = useRef<HTMLDivElement>(null)
  const pageLabel = useCallback((page: number) => t('fileViewer:pdfPage', { page }), [t])
  const pdf = usePdfViewer({ store, path: target.path, containerRef: pdfContainerRef, viewerRef: pdfViewerRef, pageLabel })
  const { goToPage } = pdf
  const toolbarRef = useRef<HTMLDivElement>(null)

  // A target page (a quote's source) is applied whenever a target is opened.
  useEffect(() => {
    if (target.page) goToPage(target.page)
  }, [target, goToPage])

  // The shown file version's reading position key, once the target file has been read.
  let positionKey: string | null = null
  if (isPdf && pdf.status.state === 'ready' && pdf.status.path === target.path) {
    positionKey = readingPositionKey(target.path, pdf.status.size, pdf.status.lastModified)
  } else if (!isPdf && content.state === 'ready' && content.path === target.path) {
    positionKey = readingPositionKey(target.path, content.size, content.lastModified)
  }
  const positionKeyRef = useRef(positionKey)
  positionKeyRef.current = positionKey

  // A PDF without a target page opens at its remembered page, and the page is remembered as it changes.
  useEffect(() => {
    if (!isPdf || !positionKey || target.page) return
    const stored = readReadingPosition(positionKey)
    if (stored && 'page' in stored) goToPage(stored.page)
  }, [isPdf, positionKey, target, goToPage])
  useEffect(() => {
    if (isPdf && positionKeyRef.current) writeReadingPosition(positionKeyRef.current, { page: pdf.page })
  }, [isPdf, pdf.page])

  // Markdown and text scroll to the target heading, else to the remembered position. A hidden viewer (narrow mode
  // showing the chat, the sources in its slot) has no size to scroll in, so this waits until it is shown.
  const pendingScroll = useRef<((region: HTMLElement) => void) | null>(null)
  const applyPendingScroll = useCallback(() => {
    const region = regionRef.current
    if (!region || region.clientHeight === 0 || !pendingScroll.current) return
    pendingScroll.current(region)
    pendingScroll.current = null
  }, [])
  useEffect(() => {
    if (isPdf || !positionKey) return
    pendingScroll.current = (region) => {
      const heading = target.heading && contentRef.current ? findHeading(contentRef.current, target.heading) : null
      if (heading) {
        const offset = heading.getBoundingClientRect().top - region.getBoundingClientRect().top - (toolbarRef.current?.offsetHeight ?? 0)
        region.scrollTop += offset - 8
        return
      }
      const stored = readReadingPosition(positionKey)
      if (stored && 'scroll' in stored) region.scrollTop = stored.scroll * (region.scrollHeight - region.clientHeight)
    }
    applyPendingScroll()
  }, [isPdf, positionKey, target, applyPendingScroll])
  useEffect(() => {
    const region = regionRef.current
    if (!region || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(applyPendingScroll)
    observer.observe(region)
    return () => observer.disconnect()
  }, [applyPendingScroll])

  const saveScrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(saveScrollTimer.current), [])
  const onRegionScroll = () => {
    if (floating) hideFloating()
    const region = regionRef.current
    const key = positionKeyRef.current
    if (isPdf || !region || !key || region.clientHeight === 0 || pendingScroll.current) return
    const scroll = scrollFraction(region)
    clearTimeout(saveScrollTimer.current)
    saveScrollTimer.current = setTimeout(() => writeReadingPosition(key, { scroll }), SAVE_SCROLL_DELAY_MS)
  }

  // Opening a file moves focus to it, so keyboard and screen reader users land in the viewer.
  useEffect(() => {
    regionRef.current?.focus({ preventScroll: true })
    regionRef.current?.scrollTo?.({ top: 0 })
  }, [target.path])

  const act = (action: SelectionAction) => {
    if (!selected || !onAddQuote) return
    if (action !== 'ask' && quickActionsDisabled) return
    hideFloating()
    if (action === 'ask') onAddQuote(selected)
    else onAddQuote(selected, { message: quickMessages[action], send: true })
  }

  const quickMessages = {
    explain: t('fileViewer:explainMessage'),
    summarize: t('fileViewer:summarizeMessage'),
    translate: t('fileViewer:translateMessage'),
  }
  const actionLabels: Record<SelectionAction, string> = {
    explain: t('fileViewer:explain'),
    summarize: t('fileViewer:summarize'),
    translate: t('fileViewer:translate'),
    ask: t('fileViewer:ask'),
  }
  const actionDisabled = (action: SelectionAction) => !selected || (action !== 'ask' && quickActionsDisabled)

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
      onScroll={onRegionScroll}
      onKeyDown={floating ? (event) => event.key === 'Escape' && hideFloating() : undefined}
      sx={{
        height: '100%',
        overflow: isPdf ? 'hidden' : 'auto',
        bgcolor: 'background.paper',
        ...(isPdf ? { display: 'flex', flexDirection: 'column' } : {}),
        ...focusIndicatorStyle(),
      }}
    >
      <Box
        ref={toolbarRef}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          px: 2,
          // The global menu button is about 40px wide, 15–20px from the edge.
          pr: onBackToChat ? '72px' : 2,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {onBackToChat && (
          <Button size="small" startIcon={<ArrowBack />} onClick={onBackToChat} data-testid="file-viewer-back-to-chat" sx={{ flexShrink: 0 }}>
            {t('fileViewer:backToChat')}
          </Button>
        )}
        <Tooltip title={target.path} describeChild>
          <Typography id={titleId} component="h2" variant="subtitle1" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
            {name}
          </Typography>
        </Tooltip>
        <ExperimentalChip sx={{ ml: 0, flexShrink: 0 }} />
        {/* The PDF controls get their own row, after the close button. */}
        {isPdf && pdf.status.state === 'ready' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, order: 1, width: '100%' }}>
            <Typography variant="body2" color="text.secondary" data-testid="file-viewer-pdf-page" sx={{ mx: 0.5, whiteSpace: 'nowrap' }}>
              {t('fileViewer:pageOf', { page: pdf.page, count: pdf.status.pageCount })}
            </Typography>
            <IconButton size="small" onClick={pdf.zoomOut} aria-label={t('fileViewer:zoomOut')} data-testid="file-viewer-zoom-out">
              <Remove fontSize="small" />
            </IconButton>
            <Typography variant="body2" color="text.secondary" data-testid="file-viewer-zoom" sx={{ minWidth: '3.5em', textAlign: 'center' }}>
              {t('fileViewer:zoomPercent', { percent: Math.round(pdf.scale * 100) })}
            </Typography>
            <IconButton size="small" onClick={pdf.zoomIn} aria-label={t('fileViewer:zoomIn')} data-testid="file-viewer-zoom-in">
              <Add fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={pdf.fitWidth} aria-label={t('fileViewer:fitWidth')} data-testid="file-viewer-fit-width">
              <FitScreen fontSize="small" />
            </IconButton>
          </Box>
        )}
        {onAddQuote && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 'auto' }}>
            {SELECTION_ACTIONS.map((action) => (
              <Button
                key={action}
                size="small"
                variant="outlined"
                disabled={actionDisabled(action)}
                onMouseDown={keepSelection}
                onClick={() => act(action)}
                data-testid={`file-viewer-${action}`}
                sx={{ flexShrink: 0 }}
              >
                {actionLabels[action]}
              </Button>
            ))}
          </Box>
        )}
        <IconButton onClick={onClose} aria-label={t('fileViewer:closeNamed', params)} data-testid="file-viewer-close" sx={{ ml: onAddQuote ? 0 : 'auto' }}>
          <Close />
        </IconButton>
      </Box>
      <Box
        ref={contentRef}
        onMouseUp={onAddQuote && floatingToolbar ? onMouseUp : undefined}
        sx={isPdf ? { flex: 1, minHeight: 0, position: 'relative' } : { px: 3, py: 2, position: 'relative' }}
      >
        {isPdf && (
          <>
            {/* pdf.js needs an absolutely positioned scroll container; its styles are scoped to it. */}
            <Box
              ref={pdfContainerRef}
              className={PDF_VIEWER_SCOPE_CLASS}
              role="region"
              aria-label={t('fileViewer:pdfPages')}
              tabIndex={0}
              data-testid="file-viewer-pdf"
              data-page={pdf.status.state === 'ready' ? pdf.page : undefined}
              onScroll={floating ? hideFloating : undefined}
              sx={{ position: 'absolute', inset: 0, overflow: 'auto', bgcolor: 'action.hover', ...focusIndicatorStyle() }}
            >
              <div ref={pdfViewerRef} className="pdfViewer" />
            </Box>
            {pdf.status.state !== 'ready' && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                {pdf.status.state === 'loading' && <LinearProgress aria-label={t('common:loading')} />}
                {pdf.status.state === 'missing' && message(t('myFiles:fileMissing', params), true)}
                {pdf.status.state === 'password' && message(t('fileViewer:pdfPassword'), true)}
                {pdf.status.state === 'invalid' && message(t('fileViewer:pdfInvalid'), true)}
                {pdf.status.state === 'error' && message(t('myFiles:error'), true)}
              </Box>
            )}
          </>
        )}
        {!isPdf && content.state === 'loading' && <LinearProgress aria-label={t('common:loading')} />}
        {!isPdf && content.state === 'missing' && message(t('myFiles:fileMissing', params), true)}
        {!isPdf && content.state === 'tooLarge' && message(t('fileViewer:tooLarge'))}
        {!isPdf && content.state === 'unsupported' && message(t('fileViewer:unsupported'))}
        {!isPdf && content.state === 'error' && message(t('myFiles:error'), true)}
        {!isPdf &&
          content.state === 'ready' &&
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
        {onAddQuote && floatingToolbar && floating && selected && (
          <Paper
            role="toolbar"
            aria-label={t('fileViewer:selectionActions')}
            elevation={4}
            data-testid="file-viewer-selection-toolbar"
            sx={{
              position: 'absolute',
              top: floating.top,
              left: floating.left,
              zIndex: 2,
              p: 0.5,
              display: 'flex',
              flexWrap: 'wrap',
              maxWidth: '100%',
              userSelect: 'none',
            }}
          >
            {SELECTION_ACTIONS.map((action) => (
              <Button
                key={action}
                size="small"
                disabled={actionDisabled(action)}
                onMouseDown={keepSelection}
                onClick={() => act(action)}
                data-testid={`file-viewer-selection-${action}`}
              >
                {actionLabels[action]}
              </Button>
            ))}
          </Paper>
        )}
      </Box>
    </Box>
  )
}

export default FileViewer
