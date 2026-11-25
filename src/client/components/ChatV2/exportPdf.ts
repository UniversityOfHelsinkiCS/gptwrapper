import type { BlockContent, DefinitionContent, List, RootContent, Table } from 'mdast'
import { type ExportDocument, flattenInline, type InlineRun, inlineText, messageHeadingLevel } from './exportDocument'

/**
 * Tagged PDF (PDF/UA) export of a conversation with pdfkit. Every piece of text is drawn inside a structure
 * element (H1–H6, P, L/LI/Lbl/LBody, Table/TR/TH/TD, Link, Code, BlockQuote), the document has a title and a
 * language and its fonts are embedded, so screen readers can read it and navigate it by headings.
 */

export type PdfFonts = { regular: Uint8Array; bold: Uint8Array; italic: Uint8Array; boldItalic: Uint8Array; mono: Uint8Array }

// pdfkit's types lag behind its tagging and table API, so the parts used here are typed locally
type StructElement = { add: (child: StructElement | (() => void)) => StructElement; end: () => void }
type PdfDoc = {
  _font?: { font?: { hasGlyphForCodePoint?: (codePoint: number) => boolean } }
  x: number
  y: number
  page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } }
  registerFont: (name: string, src: Uint8Array) => PdfDoc
  font: (name: string) => PdfDoc
  fontSize: (size: number) => PdfDoc
  fillColor: (color: string) => PdfDoc
  text: (text: string, ...args: unknown[]) => PdfDoc
  moveDown: (lines?: number) => PdfDoc
  addPage: () => PdfDoc
  currentLineHeight: (includeGap?: boolean) => number
  struct: (type: string, options?: Record<string, unknown>) => StructElement
  addStructure: (el: StructElement) => PdfDoc
  table: (opts: Record<string, unknown>) => unknown
  on: (event: string, cb: (chunk?: Uint8Array) => void) => PdfDoc
  end: () => void
}
export type PdfDocumentConstructor = new (options: Record<string, unknown>) => unknown

const MARGIN = 56
const BODY_SIZE = 10.5
const NOTE_SIZE = 9
const HEADING_SIZES = [20, 15, 13, 12, 11, 11]
const LIST_INDENT = 16
const QUOTE_INDENT = 16
const TEXT_COLOR = '#1a1a1a'
const NOTE_COLOR = '#555555'
const LINK_COLOR = '#0b5c80'
// Only glyphs that Noto Sans has
const BULLETS = ['•', '–', '•']

type BlockOptions = { indent: number; listDepth: number; italic?: boolean; tight?: boolean }

class PdfRenderer {
  constructor(private doc: PdfDoc) {}

  private get contentWidth() {
    return this.doc.page.width - MARGIN * 2
  }

  private get bottom() {
    return this.doc.page.height - this.doc.page.margins.bottom
  }

  /** Starts a new page when less than `height` is left, so that e.g. a heading isn't left alone at the bottom */
  private ensureSpace(height: number) {
    if (this.doc.y + height > this.bottom) this.doc.addPage()
  }

  private glyphCache = new Map<string, boolean>()

  /** Whether the embedded font has a glyph for the character. Noto Sans has no emoji, for example. */
  private hasGlyph(fontName: string, char: string) {
    const codePoint = char.codePointAt(0) ?? 0
    if (codePoint < 0x20) return true // line breaks and tabs are handled by the layout
    const key = `${fontName}:${codePoint}`
    let has = this.glyphCache.get(key)
    if (has === undefined) {
      this.doc.font(fontName)
      has = this.doc._font?.font?.hasGlyphForCodePoint?.(codePoint) ?? true
      this.glyphCache.set(key, has)
    }
    return has
  }

  /**
   * Leaves out the characters the font cannot draw. Drawn, they would be empty boxes in the text and NUL
   * characters in the text layer, and screen readers stop reading the text at them.
   */
  private drawable(run: InlineRun) {
    const font = this.fontFor(run)
    return Array.from(run.text)
      .filter((char) => this.hasGlyph(font, char))
      .join('')
  }

  private fontFor(run: InlineRun) {
    if (run.code) return 'Mono'
    if (run.bold && run.italic) return 'BoldItalic'
    if (run.bold) return 'Bold'
    if (run.italic) return 'Italic'
    return 'Regular'
  }

  private writeRuns(parent: StructElement, type: string, runs: InlineRun[], opts: { size: number; indent: number; color?: string }) {
    const doc = this.doc
    const original = runs.map((run) => run.text).join('')
    const drawn = runs.map((run) => ({ ...run, text: this.drawable(run) }))
    // Text that started with e.g. an emoji would otherwise start with a space
    if (drawn.length > 0) drawn[0] = { ...drawn[0], text: drawn[0].text.trimStart() }
    const visible = drawn.filter((run) => run.text.length > 0)
    if (visible.length === 0 && !original.trim()) return
    if (visible.length === 0) visible.push({ text: ' ' })

    const segments: { link?: string; runs: InlineRun[] }[] = []
    visible.forEach((run) => {
      const last = segments[segments.length - 1]
      if (last && last.link === run.link) last.runs.push(run)
      else segments.push({ link: run.link, runs: [run] })
    })

    const drawnText = visible.map((run) => run.text).join('')
    const element = doc.struct(type, drawnText !== original ? { actual: original } : {})
    parent.add(element)
    const x = MARGIN + opts.indent
    const width = this.contentWidth - opts.indent
    let written = 0
    this.ensureSpace(doc.currentLineHeight(true))

    segments.forEach((segment) => {
      const draw = () => {
        segment.runs.forEach((run) => {
          written++
          doc
            .font(this.fontFor(run))
            .fontSize(opts.size)
            .fillColor(run.link ? LINK_COLOR : opts.color ?? TEXT_COLOR)
          const textOptions = { width, continued: written < visible.length, link: run.link ?? null, underline: !!run.link, strike: !!run.strike, lineGap: 2 }
          if (written === 1) doc.text(run.text, x, doc.y, textOptions)
          else doc.text(run.text, textOptions)
        })
      }
      if (segment.link) {
        const link = doc.struct('Link')
        element.add(link)
        link.add(draw)
        link.end()
      } else {
        element.add(draw)
      }
    })
    element.end()
  }

  heading(parent: StructElement, level: number, runs: InlineRun[], indent = 0) {
    const size = HEADING_SIZES[level - 1]
    this.doc.fontSize(size)
    this.doc.moveDown(level <= 2 ? 0.8 : 0.5)
    this.ensureSpace(size * 1.4 + BODY_SIZE * 3)
    this.writeRuns(
      parent,
      `H${level}`,
      runs.map((run) => ({ ...run, bold: true })),
      { size, indent },
    )
    this.doc.moveDown(0.3)
  }

  paragraph(parent: StructElement, runs: InlineRun[], opts: BlockOptions & { size?: number; color?: string; type?: string }) {
    this.writeRuns(parent, opts.type ?? 'P', opts.italic ? runs.map((run) => ({ ...run, italic: true })) : runs, {
      size: opts.size ?? BODY_SIZE,
      indent: opts.indent,
      color: opts.color,
    })
    this.doc.fontSize(BODY_SIZE).moveDown(opts.tight ? 0.2 : 0.5)
  }

  private list(parent: StructElement, list: List, opts: BlockOptions) {
    const doc = this.doc
    const listElement = doc.struct('L')
    parent.add(listElement)

    list.children.forEach((item, index) => {
      const itemElement = doc.struct('LI')
      listElement.add(itemElement)
      const label = list.ordered ? `${(list.start ?? 1) + index}.` : BULLETS[opts.listDepth % BULLETS.length]

      doc.font('Regular').fontSize(BODY_SIZE)
      this.ensureSpace(doc.currentLineHeight(true) * 2)
      const y = doc.y
      const labelElement = doc.struct('Lbl')
      itemElement.add(labelElement)
      labelElement.add(() => {
        doc
          .font('Regular')
          .fontSize(BODY_SIZE)
          .fillColor(TEXT_COLOR)
          .text(label, MARGIN + opts.indent, y, { width: LIST_INDENT + 4, lineBreak: false })
      })
      labelElement.end()
      doc.y = y

      const body = doc.struct('LBody')
      itemElement.add(body)
      item.children.forEach((child) =>
        this.block(body, child, { ...opts, indent: opts.indent + LIST_INDENT + 6, listDepth: opts.listDepth + 1, tight: !list.spread }),
      )
      body.end()
      itemElement.end()
    })

    listElement.end()
    if (opts.listDepth === 0) doc.moveDown(0.3)
  }

  private table(parent: StructElement, table: Table, opts: BlockOptions) {
    const doc = this.doc
    doc
      .font('Regular')
      .fontSize(NOTE_SIZE + 0.5)
      .fillColor(TEXT_COLOR)
    this.ensureSpace(doc.currentLineHeight(true) * 3)
    const data = table.children.map((row, rowIndex) =>
      row.children.map((cell) =>
        rowIndex === 0
          ? { text: this.drawable({ text: inlineText(cell.children), bold: true }).trim(), type: 'TH', scope: 'Column', font: { src: 'Bold' } }
          : { text: this.drawable({ text: inlineText(cell.children) }).trim(), type: 'TD' },
      ),
    )

    doc.font('Regular').fontSize(NOTE_SIZE + 0.5)
    doc.table({
      structParent: parent,
      position: { x: MARGIN + opts.indent, y: doc.y },
      maxWidth: this.contentWidth - opts.indent,
      defaultStyle: { border: 0.5, borderColor: '#999999', padding: 4 },
      data,
    })
    doc.x = MARGIN
    doc.font('Regular').fontSize(BODY_SIZE).moveDown(0.5)
  }

  block(parent: StructElement, node: RootContent | BlockContent | DefinitionContent, opts: BlockOptions) {
    const doc = this.doc
    switch (node.type) {
      case 'heading':
        this.heading(parent, messageHeadingLevel(node.depth), flattenInline(node.children), opts.indent)
        return
      case 'paragraph':
        this.paragraph(parent, flattenInline(node.children), opts)
        return
      case 'list':
        this.list(parent, node, opts)
        return
      case 'blockquote': {
        const quote = doc.struct('BlockQuote')
        parent.add(quote)
        node.children.forEach((child) => this.block(quote, child, { ...opts, indent: opts.indent + QUOTE_INDENT, italic: true }))
        quote.end()
        return
      }
      case 'code':
      case 'math': {
        const paragraph = doc.struct('P')
        parent.add(paragraph)
        this.paragraph(paragraph, [{ text: node.value, code: true }], { ...opts, indent: opts.indent + 8, size: BODY_SIZE - 1, type: 'Code' })
        paragraph.end()
        return
      }
      case 'table':
        this.table(parent, node, opts)
        return
      case 'html':
        this.paragraph(parent, [{ text: node.value }], opts)
        return
      case 'footnoteDefinition':
        node.children.forEach((child) => this.block(parent, child, opts))
        return
      default:
        return
    }
  }
}

export const renderConversationPdf = (PDFDocument: PdfDocumentConstructor, exportDoc: ExportDocument, fonts: PdfFonts): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        pdfVersion: '1.7',
        tagged: true,
        subset: 'PDF/UA',
        lang: exportDoc.lang,
        displayTitle: true,
        info: { Title: exportDoc.title, Creator: 'CurreChat' },
        bufferPages: false,
        font: null,
      }) as PdfDoc

      const chunks: Uint8Array[] = []
      doc.on('data', (chunk) => chunk && chunks.push(chunk))
      doc.on('end', () => {
        const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0))
        let offset = 0
        chunks.forEach((c) => {
          out.set(c, offset)
          offset += c.length
        })
        resolve(out)
      })

      doc.registerFont('Regular', fonts.regular)
      doc.registerFont('Bold', fonts.bold)
      doc.registerFont('Italic', fonts.italic)
      doc.registerFont('BoldItalic', fonts.boldItalic)
      doc.registerFont('Mono', fonts.mono)
      doc.font('Regular')

      const root = doc.struct('Document')
      doc.addStructure(root)
      const renderer = new PdfRenderer(doc)

      renderer.heading(root, 1, [{ text: exportDoc.title }])
      exportDoc.sections.forEach((section) => {
        const sect = doc.struct('Sect')
        root.add(sect)
        renderer.heading(sect, 2, [{ text: section.heading }])
        section.content.children.forEach((node) => renderer.block(sect, node, { indent: 0, listDepth: 0 }))
        section.notes.forEach((note) =>
          renderer.paragraph(sect, [{ text: note, italic: true }], { indent: 0, listDepth: 0, size: NOTE_SIZE, color: NOTE_COLOR }),
        )
        sect.end()
      })
      root.end()
      doc.end()
    } catch (error) {
      reject(error)
    }
  })

// The fonts are only fetched, and pdfkit only loaded, when someone actually downloads a PDF
const FONT_URLS = {
  regular: () => import('../../assets/fonts/NotoSans-Regular.ttf?url'),
  bold: () => import('../../assets/fonts/NotoSans-Bold.ttf?url'),
  italic: () => import('../../assets/fonts/NotoSans-Italic.ttf?url'),
  boldItalic: () => import('../../assets/fonts/NotoSans-BoldItalic.ttf?url'),
  mono: () => import('../../assets/fonts/NotoSansMono-Regular.ttf?url'),
}

const loadFont = async (load: () => Promise<{ default: string }>) => {
  const { default: url } = await load()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load font ${url}`)
  return new Uint8Array(await response.arrayBuffer())
}

export const exportPdfBlob = async (exportDoc: ExportDocument): Promise<Blob> => {
  const [{ default: PDFDocument }, regular, bold, italic, boldItalic, mono] = await Promise.all([
    import('pdfkit'),
    loadFont(FONT_URLS.regular),
    loadFont(FONT_URLS.bold),
    loadFont(FONT_URLS.italic),
    loadFont(FONT_URLS.boldItalic),
    loadFont(FONT_URLS.mono),
  ])
  const bytes = await renderConversationPdf(PDFDocument as unknown as PdfDocumentConstructor, exportDoc, { regular, bold, italic, boldItalic, mono })
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
