import { Box, Typography, useTheme } from '@mui/material'
import { visuallyHidden } from '@mui/utils'
import { useId, useMemo, useRef, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown, { type Components } from 'react-markdown'
import type { Pluggable } from 'unified'
import { PrismAsync as SyntaxHighlighter } from 'react-syntax-highlighter'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import 'katex/dist/contrib/mhchem'
import { ScrollableRegion } from '../common/accessibility/ScrollableRegion'
import { accessibleOneDark } from './codeTheme'
import CopyToClipboardButton from './CopyToClipboardButton'
import { outputFileComponents } from './tools/OutputFiles'
import { remarkOutputLinks } from './tools/remarkOutputLinks'
import { preprocessMath } from './util'

/**
 * Where the markdown comes from:
 * - `chat`: a chat answer, rendered as before (links and images as written).
 * - `file`: a file from My files, which may be written by the agent or come from anywhere. Images are not loaded
 *   (a remote image URL could leak data), external links open in a new tab, `#anchor` links scroll inside the
 *   rendered content and relative links are plain text.
 */
export type MarkdownSource = 'chat' | 'file'

const hasScheme = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href)

/** GitHub-style heading slug, so that `#some-heading` links in a file can find their heading. */
export const headingSlug = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')

/** Heading and footnote ids get this prefix, as react-markdown does for gfm footnotes, so they cannot clash with the page's own ids. */
const ID_PREFIX = 'user-content-'

const textOf = (children: ReactNode): string => {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(textOf).join('')
  if (children && typeof children === 'object' && 'props' in children) return textOf((children.props as { children?: ReactNode }).children)
  return ''
}

/**
 * Markdown with the chat's setup: gfm, math with KaTeX, highlighted code blocks with a copy button and scrollable
 * tables and formulas. Raw HTML stays escaped (no rehype-raw). In a chat answer, links, images and mentions of
 * `Outputs/` files (the answer's `outputPaths`) download or show the file from My files.
 */
export const MarkdownContent = ({ text, source = 'chat', outputPaths = [] }: { text: string; source?: MarkdownSource; outputPaths?: string[] }) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const processed = useMemo(() => preprocessMath(text), [text])
  const rootRef = useRef<HTMLDivElement>(null)
  const katexOptions = {
    macros: {
      '\\abs': '\\left|#1\\right|',
      '\\norm': '\\left\\|#1\\right\\|',
      '\\R': '\\mathbb{R}',
      '\\C': '\\mathbb{C}',
      '\\N': '\\mathbb{N}',
      '\\Z': '\\mathbb{Z}',
      '\\vec': '\\mathbf{#1}',
      '\\deriv': '\\frac{d#1}{d#2}',
      '\\pdv': '\\frac{\\partial#1}{\\partial#2}',
      '\\set': '\\left\\{#1\\right\\}',
      '\\lr': '\\left(#1\\right)',
      '\\T': '^{\\mathsf{T}}',
      '\\defeq': '\\coloneqq',
      '\\epsilon_0': '\\text{\\ensuremath{\\epsilon_0}}',
      '\\mu_0': '\\text{\\ensuremath{\\mu_0}}',
      '\\div': '\\operatorname{div}',
      '\\curl': '\\operatorname{curl}',
      '\\grad': '\\operatorname{grad}',
      '\\laplacian': '\\nabla^2',
      '\\dd': '\\mathrm{d}#1',
      '\\pd': '\\partial #1',
      '\\vb': '\\mathbf{#1}',
      '\\vu': '\\hat{\\mathbf{#1}}',
      '\\aprx': '\\approx',
      '\\bra': '\\left\\langle#1\\right|',
      '\\ket': '\\left|#1\\right\\rangle',
      '\\braket': '\\left\\langle#1\\mid#2\\right\\rangle',
      '\\oprod': '\\left|#1\\right\\rangle\\left\\langle#2\\right|',
      '\\slashed': '\\text{{#1\\mkern-10mu/}}',
    },
    extensions: ['mhchem.js'],
    output: 'htmlAndMathml',
    errorColor: theme.palette.error.main,
    throwOnError: true,
    strict: 'error', // disables logging katex warnings/errors – if debugging, turn these two on
  }

  // Unique per rendered text, also when several are on the same page.
  const codeBlockIdPrefix = useId()
  let codeCount = 0
  const slugCounts = new Map<string, number>()

  const chatComponents: Components = {
    ...(source === 'chat' && outputFileComponents),
    pre(props) {
      const { children, node, ...rest } = props
      const codeNode = node?.children[0]
      if (codeNode?.type === 'element' && /language-(\w+)/.test(String(codeNode.properties.className ?? ''))) {
        return <>{children}</>
      }
      return <pre {...rest}>{children}</pre>
    },
    table(props) {
      const { node, ...rest } = props
      return (
        <ScrollableRegion label={t('accessibility:scrollableTable')} sx={{ '& th, & td': { wordBreak: 'normal', overflowWrap: 'normal' } }}>
          <table {...rest} />
        </ScrollableRegion>
      )
    },
    span(props) {
      const { node, ...rest } = props
      if (!rest.className?.includes('katex-display')) {
        return <span {...rest} />
      }
      return (
        <ScrollableRegion label={t('accessibility:scrollableFormula')}>
          <span {...rest} />
        </ScrollableRegion>
      )
    },
    code(props) {
      const { children, className, node, ...rest } = props
      const match = /language-(\w+)/.exec(className || '')
      const language = match?.[1] || 'plaintext' // safe fallback

      if (match) {
        const codeBlockId = `${codeBlockIdPrefix}codeBlock-${++codeCount}`

        return (
          <Box
            sx={{
              borderRadius: '0.5rem',
              overflowX: 'auto',
            }}
          >
            <Typography
              sx={{
                opacity: 1,
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                backgroundColor: 'action.hover',
              }}
            >
              {language}
            </Typography>
            <Box sx={{ position: 'relative' }}>
              {/* @ts-ignore */}
              <SyntaxHighlighter
                {...rest}
                PreTag="pre"
                children={String(children)}
                language={language}
                customStyle={{
                  padding: '1rem 4rem 1rem 1rem', // 4rem keeps the CopyToClipboard button visible
                  margin: 0,
                  fontSize: '15px',
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}
                style={accessibleOneDark}
                className="scrollable-code-highlight"
                id={codeBlockId}
              />
              <CopyToClipboardButton
                id={codeBlockId}
                copied={String(children)}
                label={t('chat:codeBlock')}
                iconColor="#FFF"
                buttonStyle={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                }}
              />
            </Box>
          </Box>
        )
      } else {
        return (
          <code {...rest} className={className}>
            {children}
          </code>
        )
      }
    },
  }

  const scrollToAnchor = (event: MouseEvent, hash: string) => {
    event.preventDefault()
    let id = hash
    try {
      id = decodeURIComponent(hash)
    } catch {
      // A malformed escape is looked up as written.
    }
    const root = rootRef.current
    const target = root?.querySelector(`[id="${CSS.escape(id)}"]`) ?? root?.querySelector(`[id="${CSS.escape(ID_PREFIX + id)}"]`)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: 'start' })
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  }

  const heading =
    (Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
    ({ node, children, ...rest }: { node?: unknown; children?: ReactNode }) => {
      const slug = headingSlug(textOf(children))
      const count = slugCounts.get(slug) ?? 0
      slugCounts.set(slug, count + 1)
      return (
        <Tag {...rest} id={`${ID_PREFIX}${count ? `${slug}-${count}` : slug}`}>
          {children}
        </Tag>
      )
    }

  const fileComponents: Components = {
    ...chatComponents,
    h1: heading('h1'),
    h2: heading('h2'),
    h3: heading('h3'),
    h4: heading('h4'),
    h5: heading('h5'),
    h6: heading('h6'),
    img({ alt }) {
      return (
        <Box
          component="span"
          data-testid="markdown-image-placeholder"
          sx={{ display: 'inline-block', px: 0.5, border: '1px dashed', borderColor: 'divider', borderRadius: '0.25rem', color: 'text.secondary' }}
        >
          {alt ? t('fileViewer:imageAlt', { alt, interpolation: { escapeValue: false } }) : t('fileViewer:image')}
        </Box>
      )
    },
    a({ href, children, node, ...rest }) {
      if (href?.startsWith('#')) {
        return (
          <a {...rest} href={href} onClick={(event) => scrollToAnchor(event, href.slice(1))}>
            {children}
          </a>
        )
      }
      if (href && hasScheme(href)) {
        return (
          <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
            {children}
            <Box component="span" sx={visuallyHidden}>
              {` (${t('accessibility:opensInNewTab')})`}
            </Box>
          </a>
        )
      }
      // Relative links point to other files, which the viewer cannot open yet.
      return <span>{children}</span>
    },
  }

  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }], ...(source === 'chat' ? [[remarkOutputLinks, outputPaths] as Pluggable] : [])]}
      rehypePlugins={[[rehypeKatex, katexOptions]]}
      components={source === 'file' ? fileComponents : chatComponents}
    >
      {processed}
    </ReactMarkdown>
  )
  // The wrapper scopes the anchor lookup; chat answers render without one, as before.
  return source === 'file' ? <div ref={rootRef}>{markdown}</div> : markdown
}
