import type { BlockContent, DefinitionContent, List, PhrasingContent, RootContent, Table as MdTable } from 'mdast'
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  type ILevelsOptions,
  LevelFormat,
  Packer,
  Paragraph,
  type ParagraphChild,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { type ExportDocument, flattenInline, type InlineRun, messageHeadingLevel } from './exportDocument'

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const

const MONO_FONT = 'Courier New'

const headingParagraph = (level: number, options: { text?: string; children?: ParagraphChild[] }) =>
  new Paragraph({ ...options, heading: HEADING_LEVELS[level - 1], outlineLevel: level - 1 })

const HEADING_SIZES = [36, 30, 26, 24, 22, 22] // half-points
const headingStyles = Object.fromEntries(
  HEADING_SIZES.map((size, i) => [
    `heading${i + 1}`,
    { run: { bold: true, size, color: '000000' }, paragraph: { outlineLevel: i, keepNext: true, spacing: { before: i < 2 ? 360 : 240, after: 120 } } },
  ]),
)
const BULLET_REFERENCE = 'bullet-list'
const LIST_INDENT = 360

const listLevels = (format: (typeof LevelFormat)[keyof typeof LevelFormat], start = 1): ILevelsOptions[] =>
  Array.from({ length: 6 }, (_, level) => ({
    level,
    format,
    start,
    text: format === LevelFormat.BULLET ? ['•', '◦', '▪'][level % 3] : `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: LIST_INDENT * 2 * (level + 1), hanging: LIST_INDENT } } },
  }))

const runsToChildren = (runs: InlineRun[]): ParagraphChild[] => {
  const textRun = (run: InlineRun) =>
    new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      strike: run.strike,
      font: run.code ? MONO_FONT : undefined,
      style: run.link ? 'Hyperlink' : undefined,
    })

  const children: ParagraphChild[] = []
  runs.forEach((run) => {
    // Line breaks inside a paragraph
    const pieces = run.text.split('\n')
    pieces.forEach((piece, i) => {
      if (i > 0) children.push(new TextRun({ break: 1 }))
      if (!piece) return
      const r = textRun({ ...run, text: piece })
      children.push(run.link ? new ExternalHyperlink({ link: run.link, children: [r] }) : r)
    })
  })
  return children
}

const inline = (nodes: PhrasingContent[]) => runsToChildren(flattenInline(nodes))

type Context = {
  /** Nesting depth of the current list, -1 outside lists */
  listLevel: number
  /** Extra left indent for paragraphs that continue a list item or are in a quote */
  indent: number
  quote: boolean
  orderedLists: { reference: string; start: number }[]
}

// Width of the text area of the default A4 page with 1 inch margins, in twips
const CONTENT_WIDTH = 9026

const renderTable = (table: MdTable, indent: number): Table => {
  const columns = Math.max(...table.children.map((row) => row.children.length), 1)
  const columnWidth = Math.floor((CONTENT_WIDTH - indent) / columns)
  return new Table({
    // An explicit grid and cell widths: without them the table grid is broken (columns 100 twips wide),
    // and screen readers can misread which cells belong together
    width: { size: columnWidth * columns, type: WidthType.DXA },
    columnWidths: Array.from({ length: columns }, () => columnWidth),
    indent: indent ? { size: indent, type: WidthType.DXA } : undefined,
    rows: table.children.map(
      (row, rowIndex) =>
        new TableRow({
          // Only the first row is a header row; leave the property out of the others altogether
          ...(rowIndex === 0 ? { tableHeader: true, cantSplit: true } : {}),
          children: row.children.map(
            (cell) =>
              new TableCell({
                width: { size: columnWidth, type: WidthType.DXA },
                children: [
                  new Paragraph({
                    children: rowIndex === 0 ? runsToChildren(flattenInline(cell.children).map((r) => ({ ...r, bold: true }))) : inline(cell.children),
                  }),
                ],
              }),
          ),
        }),
    ),
  })
}

const renderList = (list: List, ctx: Context): (Paragraph | Table)[] => {
  const level = ctx.listLevel + 1
  let reference = BULLET_REFERENCE
  if (list.ordered) {
    reference = `ordered-list-${ctx.orderedLists.length}`
    ctx.orderedLists.push({ reference, start: list.start ?? 1 })
  }

  return list.children.flatMap((item) => {
    const itemCtx = { ...ctx, listLevel: level, indent: LIST_INDENT * 2 * (level + 1) }
    return item.children.flatMap((child, index) => {
      // The first paragraph of an item carries the list number or bullet, the rest are indented under it
      if (index === 0 && child.type === 'paragraph') {
        return [
          new Paragraph({
            children: inline(child.children),
            numbering: { reference, level: Math.min(level, 5) },
          }),
        ]
      }
      if (index === 0) {
        return [new Paragraph({ children: [], numbering: { reference, level: Math.min(level, 5) } }), ...renderBlock(child, itemCtx)]
      }
      return renderBlock(child, itemCtx)
    })
  })
}

const renderBlock = (node: RootContent | BlockContent | DefinitionContent, ctx: Context): (Paragraph | Table)[] => {
  const indent = ctx.indent ? { left: ctx.indent } : undefined
  const style = ctx.quote ? 'Quote' : undefined

  switch (node.type) {
    case 'heading':
      return [headingParagraph(messageHeadingLevel(node.depth), { children: inline(node.children) })]
    case 'paragraph':
      return [new Paragraph({ children: inline(node.children), indent, style })]
    case 'list':
      return renderList(node, ctx)
    case 'blockquote':
      return node.children.flatMap((child) => renderBlock(child, { ...ctx, quote: true }))
    case 'code':
    case 'math':
      return [
        new Paragraph({
          style: 'CodeBlock',
          indent,
          children: node.value.split('\n').flatMap((line, i) => [...(i > 0 ? [new TextRun({ break: 1 })] : []), new TextRun({ text: line, font: MONO_FONT })]),
        }),
      ]
    case 'table':
      return [renderTable(node, ctx.indent)]
    case 'thematicBreak':
      return [new Paragraph({ children: [], thematicBreak: true })]
    case 'html':
      return [new Paragraph({ children: [new TextRun(node.value)], indent, style })]
    case 'footnoteDefinition':
      return node.children.flatMap((child) => renderBlock(child, ctx))
    default:
      return []
  }
}

export const exportDocxBlob = async (exportDoc: ExportDocument): Promise<Blob> => {
  const orderedLists: Context['orderedLists'] = []
  const children: (Paragraph | Table)[] = [headingParagraph(1, { text: exportDoc.title })]

  exportDoc.sections.forEach((section) => {
    children.push(headingParagraph(2, { text: section.heading }))
    section.content.children.forEach((node) => {
      children.push(...renderBlock(node, { listLevel: -1, indent: 0, quote: false, orderedLists }))
    })
    section.notes.forEach((note) => {
      children.push(new Paragraph({ children: [new TextRun({ text: note, italics: true })] }))
    })
  })

  const doc = new Document({
    title: exportDoc.title,
    creator: 'CurreChat',
    styles: {
      default: {
        document: { run: { language: { value: exportDoc.lang } } },
        ...headingStyles,
      },
      paragraphStyles: [
        {
          id: 'Quote',
          name: 'Quote',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { italics: true },
          paragraph: { indent: { left: 720 } },
        },
        {
          id: 'CodeBlock',
          name: 'Code Block',
          basedOn: 'Normal',
          next: 'Normal',
          run: { font: MONO_FONT },
          paragraph: { spacing: { before: 120, after: 120 } },
        },
      ],
    },
    numbering: {
      config: [
        { reference: BULLET_REFERENCE, levels: listLevels(LevelFormat.BULLET) },
        ...orderedLists.map(({ reference, start }) => ({ reference, levels: listLevels(LevelFormat.DECIMAL, start) })),
      ],
    },
    sections: [{ children }],
  })

  return Packer.toBlob(doc)
}
