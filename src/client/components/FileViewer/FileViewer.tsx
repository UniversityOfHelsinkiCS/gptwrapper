import Close from '@mui/icons-material/Close'
import { Box, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { darkModeLinkColors } from '../../theme'
import { focusIndicatorStyle } from '../../util/accessibility'
import { baseName } from '../../util/myFiles/paths'
import type { MyFilesStore } from '../../util/myFiles/store'
import { MarkdownContent } from '../ChatV2/MarkdownContent'
import { ExperimentalChip } from '../MyFiles/ExperimentalChip'
import { MAX_VIEWER_TEXT_BYTES, viewerFileKind } from './fileKind'
import type { ViewerTarget } from './FileViewerContext'

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

/**
 * A My files file shown next to the chat: Markdown rendered like chat answers (without loading images), text in a
 * wrapping monospace block. The whole panel is one labelled, focusable region that scrolls under a sticky toolbar.
 */
const FileViewer = ({ store, target, onClose }: { store: MyFilesStore; target: ViewerTarget; onClose: () => void }) => {
  const { t } = useTranslation()
  const titleId = useId()
  const regionRef = useRef<HTMLElement>(null)
  const name = baseName(target.path)
  const kind = viewerFileKind(target.path)
  const content = useFileText(store, target.path)
  const params = { name, interpolation: { escapeValue: false } }

  // Opening a file moves focus to it, so keyboard and screen reader users land in the viewer.
  useEffect(() => {
    regionRef.current?.focus({ preventScroll: true })
    regionRef.current?.scrollTo?.({ top: 0 })
  }, [target.path])

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
        <IconButton onClick={onClose} aria-label={t('fileViewer:closeNamed', params)} data-testid="file-viewer-close" sx={{ ml: 'auto' }}>
          <Close />
        </IconButton>
      </Box>
      <Box sx={{ px: 3, py: 2 }}>
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
      </Box>
    </Box>
  )
}

export default FileViewer
