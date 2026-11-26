import { Box, Button, Link, Tooltip, Typography } from '@mui/material'
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { quoteFileName, type Quote } from '@shared/quote'
import { useOpenableFile } from '../FileViewer/useOpenableFile'

const CLAMPED_LINES = 6

const clampSx = { display: '-webkit-box', WebkitLineClamp: CLAMPED_LINES, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as const

/**
 * A quote sent with a user message, above its text: the source file (and PDF page or heading) with the full path in a tooltip, and
 * the quoted text clamped to a few lines with "Show more" when it is longer. When the file is still in My files, the source is a
 * button that opens it in the viewer at the quoted page or heading.
 */
export const QuoteCard = ({ quote }: { quote: Quote }) => {
  const { t } = useTranslation()
  const textId = useId()
  const textRef = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const openSource = useOpenableFile(quote.path)

  // Only offer "Show more" when the clamp actually hides text, at the bubble's current width.
  const measure = useCallback(() => {
    const node = textRef.current
    if (node && !expanded) setOverflowing(node.scrollHeight > node.clientHeight + 1)
  }, [expanded])
  useLayoutEffect(() => {
    measure()
    const node = textRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [measure])

  const source = [quoteFileName(quote), quote.page ? t('fileViewer:pageShort', { page: quote.page }) : undefined, quote.heading].filter(Boolean).join(' · ')

  return (
    <Box component="figure" data-testid="quote-card" sx={{ m: 0, mb: 1.5, pl: 1.5, borderLeft: '3px solid', borderLeftColor: 'divider', whiteSpace: 'normal' }}>
      {openSource ? (
        <Typography component="figcaption" variant="body2" fontWeight={600} data-testid="quote-card-source" sx={{ mb: 0.5 }}>
          <Tooltip title={quote.path} describeChild>
            <Link
              component="button"
              type="button"
              variant="body2"
              aria-label={t('fileViewer:openQuoteSource', { source, interpolation: { escapeValue: false } })}
              // A new target each time, so opening the same file again jumps to this quote's page or heading.
              onClick={() => openSource({ path: quote.path, page: quote.page, heading: quote.heading })}
              data-testid="quote-card-open"
              sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'left', verticalAlign: 'baseline' }}
            >
              <span aria-hidden>📄 </span>
              {source}
            </Link>
          </Tooltip>
        </Typography>
      ) : (
        <Tooltip title={quote.path} describeChild>
          <Typography component="figcaption" variant="body2" fontWeight={600} data-testid="quote-card-source" sx={{ mb: 0.5 }}>
            <span aria-hidden>📄 </span>
            {source}
          </Typography>
        </Tooltip>
      )}
      <Box
        component="blockquote"
        id={textId}
        ref={textRef}
        data-testid="quote-card-text"
        data-clamped={!expanded}
        sx={{ m: 0, whiteSpace: 'pre-wrap', color: 'text.secondary', ...(expanded ? {} : clampSx) }}
      >
        {quote.text}
      </Box>
      {(overflowing || expanded) && (
        <Button size="small" aria-expanded={expanded} aria-controls={textId} onClick={() => setExpanded((value) => !value)} sx={{ mt: 0.5, px: 0.5 }}>
          {expanded ? t('fileViewer:showLess') : t('fileViewer:showMore')}
        </Button>
      )}
    </Box>
  )
}
