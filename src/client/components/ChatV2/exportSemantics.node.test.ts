import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strFromU8, unzipSync } from 'fflate'
import type { TFunction } from 'i18next'
import PDFDocument from 'pdfkit'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('../../../config', async () => ({ ValidModelNameSchema: (await import('zod/v4')).z.string() }))
vi.mock('../../util/featureEvents', () => ({ trackFeatureEvent: vi.fn() }))

import { buildExportDocument, type ExportDocument } from './exportDocument'
import { exportDocxBlob } from './exportDocx'
import { type PdfDocumentConstructor, type PdfFonts, renderConversationPdf } from './exportPdf'
import type { ClientChatMessage } from './messages'

const t = ((key: string) => key) as unknown as TFunction

const ANSWER = `Sorting puts **items** in *order*. See [Wikipedia](https://en.wikipedia.org/wiki/Sorting_algorithm).

### Algorithms

- Bubble sort
  - Simple to write
- Merge sort

3. Split the list
4. Merge the halves

#### Complexity

| Algorithm | Complexity |
| --- | --- |
| Merge sort | O(n log n) |
| Bubble sort | O(n²) |

> Premature optimization is the root of all evil.

\`\`\`js
const sorted = [...items].sort()
\`\`\`

Done 🎉`

const messages: ClientChatMessage[] = [
  { role: 'user', content: 'Explain sorting algorithms', attachments: 'notes.pdf' },
  {
    role: 'assistant',
    parts: [{ type: 'text', text: ANSWER }],
    generationInfo: { model: 'gpt-5', promptInfo: { type: 'saved', id: 'p1', name: 'Tutor' } } as never,
  },
  { role: 'user', content: 'Give me steps' },
  {
    role: 'assistant',
    parts: [{ type: 'text', text: '1. First step\n2. Second step' }],
    error: 'Timeout',
    generationInfo: { model: 'gpt-5', promptInfo: { type: 'custom', systemMessage: '' } } as never,
  },
]

const TITLE = 'chat:conversation 10-11-2026'
const USER = 'email:user'
const ASSISTANT_SAVED = 'email:assistant – Tutor, gpt-5'
const ASSISTANT_CUSTOM = 'email:assistant – gpt-5'

let exportDoc: ExportDocument

beforeAll(() => {
  // Only Date: pdfkit and docx use real timers and streams
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0))
  exportDoc = buildExportDocument(messages, t, 'en')
})
afterAll(() => {
  vi.useRealTimers()
})

describe('export document model', () => {
  test('has the title, the language of the UI and a section per message', () => {
    expect(exportDoc.title).toBe(TITLE)
    expect(exportDoc.lang).toBe('en-US')
    expect(exportDoc.sections.map((s) => [s.role, s.heading])).toEqual([
      ['user', USER],
      ['assistant', ASSISTANT_SAVED],
      ['user', USER],
      ['assistant', ASSISTANT_CUSTOM],
    ])
  })

  test('falls back to Finnish for unknown languages', () => {
    expect(buildExportDocument(messages, t, 'de').lang).toBe('fi-FI')
    expect(buildExportDocument(messages, t, undefined).lang).toBe('fi-FI')
    expect(buildExportDocument(messages, t, 'sv').lang).toBe('sv-SE')
  })

  test('keeps attachments and errors as notes', () => {
    expect(exportDoc.sections[0].notes).toEqual(['[Attachment: notes.pdf]'])
    expect(exportDoc.sections[3].notes).toEqual(['[Error: Timeout]'])
  })
})

// ---------------------------------------------------------------- .docx

type DocxParagraph = { style?: string; numId?: string; ilvl?: number; text: string; runs: { text: string; bold: boolean; italic: boolean }[]; xml: string }

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const parseParagraph = (xml: string): DocxParagraph => {
  const runs = Array.from(xml.matchAll(/<w:r>(.*?)<\/w:r>/gs), ([, run]) => ({
    text: Array.from(run.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gs), ([, text]) => unescapeXml(text)).join(''),
    bold: /<w:b\/>/.test(run),
    italic: /<w:i\/>/.test(run),
  }))
  const ilvl = xml.match(/<w:ilvl w:val="(\d+)"\/>/)?.[1]
  return {
    style: xml.match(/<w:pStyle w:val="([^"]+)"\/>/)?.[1],
    numId: xml.match(/<w:numId w:val="(\d+)"\/>/)?.[1],
    ilvl: ilvl === undefined ? undefined : Number(ilvl),
    text: runs.map((r) => r.text).join(''),
    runs,
    xml,
  }
}

const docxParts = async (doc: ExportDocument) => {
  const files = unzipSync(new Uint8Array(await (await exportDocxBlob(doc)).arrayBuffer()))
  const read = (name: string) => strFromU8(files[name])
  const document = read('word/document.xml')
  const numbering = read('word/numbering.xml')

  /** Format and start of the first level of a list, resolved through numId → abstractNumId */
  const listFormat = (numId: string) => {
    const abstractId = numbering.match(new RegExp(`<w:num w:numId="${numId}"[^>]*>.*?<w:abstractNumId w:val="(\\d+)"/>`, 's'))?.[1]
    const abstract = numbering.match(new RegExp(`<w:abstractNum w:abstractNumId="${abstractId}"[^>]*>(.*?)</w:abstractNum>`, 's'))?.[1] ?? ''
    const level0 = abstract.match(/<w:lvl w:ilvl="0"[^>]*>(.*?)<\/w:lvl>/s)?.[1] ?? ''
    return { format: level0.match(/<w:numFmt w:val="([^"]+)"\/>/)?.[1], start: Number(level0.match(/<w:start w:val="(\d+)"\/>/)?.[1]) }
  }

  return {
    document,
    core: read('docProps/core.xml'),
    styles: read('word/styles.xml'),
    rels: read('word/_rels/document.xml.rels'),
    paragraphs: Array.from(document.matchAll(/<w:p>.*?<\/w:p>/gs), ([xml]) => parseParagraph(xml)),
    tables: Array.from(document.matchAll(/<w:tbl>.*?<\/w:tbl>/gs), ([xml]) =>
      Array.from(xml.matchAll(/<w:tr>.*?<\/w:tr>/gs), ([row]) => ({
        header: /<w:tblHeader\/>/.test(row),
        cells: Array.from(row.matchAll(/<w:tc>.*?<\/w:tc>/gs), ([cell]) => parseParagraph(cell).text),
      })),
    ),
    listFormat,
  }
}

describe('.docx export', () => {
  let docx: Awaited<ReturnType<typeof docxParts>>
  beforeAll(async () => {
    docx = await docxParts(exportDoc)
  })

  const headings = () =>
    docx.paragraphs.flatMap((p) => {
      const level = p.style?.match(/^Heading(\d)$/)?.[1]
      return level ? [[Number(level), p.text] as const] : []
    })

  test('has the conversation title and language in the document properties', () => {
    expect(docx.core).toContain(`<dc:title>${TITLE}</dc:title>`)
    expect(docx.styles).toMatch(/<w:docDefaults>.*<w:lang w:val="en-US"\/>.*<\/w:docDefaults>/s)
  })

  test('uses real heading styles: the title is the only Heading 1 and every message has a Heading 2', () => {
    expect(headings()).toEqual([
      [1, TITLE],
      [2, USER],
      [2, ASSISTANT_SAVED],
      [3, 'Algorithms'],
      [4, 'Complexity'],
      [2, USER],
      [2, ASSISTANT_CUSTOM],
    ])
  })

  test('headings have an outline level so they show in the navigation pane', () => {
    docx.paragraphs
      .filter((p) => p.style?.startsWith('Heading'))
      .forEach((p) => expect(p.xml).toContain(`<w:outlineLvl w:val="${Number(p.style!.slice(-1)) - 1}"/>`))
  })

  test('message text follows its heading in order', () => {
    const texts = docx.paragraphs.map((p) => p.text)
    const at = (text: string) => texts.findIndex((t) => t.includes(text))
    expect(at('Explain sorting algorithms')).toBeGreaterThan(at(USER))
    expect(at(ASSISTANT_SAVED)).toBeGreaterThan(at('Explain sorting algorithms'))
    expect(at('Sorting puts')).toBeGreaterThan(at(ASSISTANT_SAVED))
    expect(at('Give me steps')).toBeGreaterThan(at('Done'))
  })

  test('keeps bold and italic text', () => {
    const paragraph = docx.paragraphs.find((p) => p.text.startsWith('Sorting puts'))!
    expect(paragraph.runs.find((r) => r.text === 'items')).toMatchObject({ bold: true, italic: false })
    expect(paragraph.runs.find((r) => r.text === 'order')).toMatchObject({ bold: false, italic: true })
  })

  test('links are real hyperlinks to the original address', () => {
    const paragraph = docx.paragraphs.find((p) => p.text.startsWith('Sorting puts'))!
    const relId = paragraph.xml.match(/<w:hyperlink[^>]*r:id="([^"]+)"[^>]*>.*?Wikipedia.*?<\/w:hyperlink>/s)?.[1]
    expect(relId).toBeDefined()
    expect(docx.rels).toMatch(new RegExp(`Id="${relId}"[^>]*Target="https://en.wikipedia.org/wiki/Sorting_algorithm"[^>]*TargetMode="External"`))
  })

  test('bulleted lists use list numbering, with nesting levels', () => {
    const item = (text: string) => docx.paragraphs.find((p) => p.text === text)!
    const [bubble, simple, merge] = [item('Bubble sort'), item('Simple to write'), item('Merge sort')]
    expect(bubble.numId).toBeDefined()
    expect([bubble.numId, simple.numId, merge.numId]).toEqual([bubble.numId, bubble.numId, bubble.numId])
    expect([bubble.ilvl, simple.ilvl, merge.ilvl]).toEqual([0, 1, 0])
    expect(docx.listFormat(bubble.numId!).format).toBe('bullet')
  })

  test('numbered lists keep their start number, and each list is numbered on its own', () => {
    const split = docx.paragraphs.find((p) => p.text === 'Split the list')!
    const merge = docx.paragraphs.find((p) => p.text === 'Merge the halves')!
    const first = docx.paragraphs.find((p) => p.text === 'First step')!
    expect(merge.numId).toBe(split.numId)
    expect(docx.listFormat(split.numId!)).toEqual({ format: 'decimal', start: 3 })
    expect(first.numId).not.toBe(split.numId)
    expect(docx.listFormat(first.numId!)).toEqual({ format: 'decimal', start: 1 })
    // The list number is not typed into the text
    expect(split.text).not.toMatch(/^3\./)
  })

  test('tables are real tables with only the first row marked as a header row', () => {
    expect(docx.tables).toEqual([
      [
        { header: true, cells: ['Algorithm', 'Complexity'] },
        { header: false, cells: ['Merge sort', 'O(n log n)'] },
        { header: false, cells: ['Bubble sort', 'O(n²)'] },
      ],
    ])
  })

  test('quotes and code blocks have their own styles', () => {
    expect(docx.paragraphs.find((p) => p.text.includes('Premature optimization'))?.style).toBe('Quote')
    expect(docx.paragraphs.find((p) => p.text.includes('const sorted'))?.style).toBe('CodeBlock')
  })

  test('keeps characters outside the basic fonts, like emoji', () => {
    expect(docx.paragraphs.some((p) => p.text === 'Done 🎉')).toBe(true)
  })

  test('attachments and errors are written after the message', () => {
    const texts = docx.paragraphs.map((p) => p.text)
    expect(texts.indexOf('[Attachment: notes.pdf]')).toBeGreaterThan(texts.indexOf('Explain sorting algorithms'))
    expect(texts.indexOf('[Error: Timeout]')).toBeGreaterThan(texts.indexOf('Second step'))
  })
})

// ---------------------------------------------------------------- PDF

const fontDir = join(dirname(fileURLToPath(import.meta.url)), '../../assets/fonts')
const font = (name: string) => new Uint8Array(readFileSync(join(fontDir, `${name}.ttf`)))
const fonts: PdfFonts = {
  regular: font('NotoSans-Regular'),
  bold: font('NotoSans-Bold'),
  italic: font('NotoSans-Italic'),
  boldItalic: font('NotoSans-BoldItalic'),
  mono: font('NotoSansMono-Regular'),
}

/** A structure element as read back by pdf.js, with the text of its marked content resolved */
type Element = { role: string; alt?: string; text: string; children: Element[]; hasAnnotation: boolean }

type RawNode = { role?: string; alt?: string; type?: string; id?: string; children?: RawNode[] }
type TextItem = { str?: string; type?: string; id?: string; tag?: string }

const readPdf = async (bytes: Uint8Array) => {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise
  const metadata = await pdf.getMetadata()
  const markInfo = await pdf.getMarkInfo()
  const roots: Element[] = []
  const untagged: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const { items } = (await page.getTextContent({ includeMarkedContent: true })) as { items: TextItem[] }

    // Text of each marked content id, and any text drawn outside marked content
    const contentText = new Map<string, string>()
    const stack: (string | null)[] = []
    items.forEach((item) => {
      if (item.type === 'beginMarkedContentProps' || item.type === 'beginMarkedContent') stack.push(item.id ?? (item.tag === 'Artifact' ? null : ''))
      else if (item.type === 'endMarkedContent') stack.pop()
      else if (item.str !== undefined) {
        const id = stack.findLast((s) => s !== '')
        if (id) contentText.set(id, (contentText.get(id) ?? '') + item.str)
        else if (id === undefined && item.str.trim()) untagged.push(item.str)
      }
    })

    const resolve = (node: RawNode): Element => {
      const children = (node.children ?? []).filter((c) => c.role).map(resolve)
      const ownText = (node.children ?? []).map((c) => (c.role ? resolve(c).text : c.type === 'content' ? contentText.get(c.id!) ?? '' : '')).join('')
      return {
        role: node.role!,
        alt: node.alt,
        text: ownText.replace(/\s+/g, ' ').trim(),
        children,
        hasAnnotation: (node.children ?? []).some((c) => c.type === 'object'),
      }
    }
    const tree = (await page.getStructTree()) as RawNode | null
    if (tree) roots.push(...(tree.children ?? []).map(resolve))
  }

  return { info: metadata.info as Record<string, unknown>, markInfo, roots, untagged, raw: new TextDecoder('latin1').decode(bytes) }
}

const all = (elements: Element[]): Element[] => elements.flatMap((el) => [el, ...all(el.children)])

describe('PDF export', () => {
  let pdf: Awaited<ReturnType<typeof readPdf>>
  let elements: Element[]
  beforeAll(async () => {
    const bytes = await renderConversationPdf(PDFDocument as unknown as PdfDocumentConstructor, exportDoc, fonts)
    pdf = await readPdf(bytes)
    elements = all(pdf.roots)
  })

  const byRole = (role: string) => elements.filter((el) => el.role === role)
  const find = (role: string, text: string) => byRole(role).find((el) => el.text.includes(text))

  test('is a tagged PDF with a title shown in the title bar and a language', () => {
    expect(pdf.markInfo?.Marked).toBe(true)
    expect(pdf.info.Title).toBe(TITLE)
    expect(pdf.info.Language).toBe('en-US')
    expect(pdf.raw).toMatch(/\/DisplayDocTitle true/)
  })

  test('declares PDF/UA conformance', () => {
    expect(pdf.raw).toMatch(/pdfuaid:part/)
  })

  test('embeds every font', () => {
    const descriptors = pdf.raw.match(/\/Type \/FontDescriptor/g) ?? []
    expect(descriptors.length).toBeGreaterThan(0)
    expect((pdf.raw.match(/\/FontFile2 /g) ?? []).length).toBe(descriptors.length)
  })

  test('all text is inside structure elements', () => {
    expect(pdf.untagged).toEqual([])
  })

  test('the structure has a Document with the title as the only H1 and a Sect per message starting with its H2', () => {
    expect(pdf.roots.map((el) => el.role)).toEqual(['Document'])
    expect(byRole('H1').map((el) => el.text)).toEqual([TITLE])
    const sections = byRole('Sect')
    expect(sections.map((s) => [s.children[0].role, s.children[0].text])).toEqual([
      ['H2', USER],
      ['H2', ASSISTANT_SAVED],
      ['H2', USER],
      ['H2', ASSISTANT_CUSTOM],
    ])
  })

  test('headings inside a message keep their level', () => {
    const headings = elements.filter((el) => /^H\d$/.test(el.role)).map((el) => [el.role, el.text])
    expect(headings).toEqual([
      ['H1', TITLE],
      ['H2', USER],
      ['H2', ASSISTANT_SAVED],
      ['H3', 'Algorithms'],
      ['H4', 'Complexity'],
      ['H2', USER],
      ['H2', ASSISTANT_CUSTOM],
    ])
  })

  test('message content is inside the section of its message', () => {
    const [user, assistant] = byRole('Sect')
    expect(user.text).toContain('Explain sorting algorithms')
    expect(user.text).toContain('[Attachment: notes.pdf]')
    expect(user.text).not.toContain('Sorting puts')
    expect(assistant.text).toContain('Sorting puts')
    expect(byRole('Sect')[3].text).toContain('[Error: Timeout]')
  })

  test('lists are L > LI > Lbl + LBody, nested lists are inside the item', () => {
    const bubble = byRole('LI').find((li) => li.text.includes('Bubble sort'))!
    expect(bubble.children.map((c) => c.role)).toEqual(['Lbl', 'LBody'])
    const [, body] = bubble.children
    expect(body.children.map((c) => c.role)).toEqual(['P', 'L'])
    expect(body.children[1].children.map((li) => li.children[1].text)).toEqual(['Simple to write'])
  })

  test('numbered lists keep their numbers in the list labels', () => {
    const list = byRole('L').find((l) => l.text.includes('Split the list'))!
    expect(list.children.map((li) => [li.children[0].text, li.children[1].text])).toEqual([
      ['3.', 'Split the list'],
      ['4.', 'Merge the halves'],
    ])
  })

  test('links are Link elements with a link annotation', () => {
    const link = find('Link', 'Wikipedia')
    expect(link).toBeDefined()
    expect(link!.hasAnnotation).toBe(true)
  })

  test('tables have rows, header cells and data cells', () => {
    const [table] = byRole('Table')
    expect(table.children.map((tr) => [tr.role, ...tr.children.map((cell) => `${cell.role}:${cell.text}`)])).toEqual([
      ['TR', 'TH:Algorithm', 'TH:Complexity'],
      ['TR', 'TD:Merge sort', 'TD:O(n log n)'],
      ['TR', 'TD:Bubble sort', 'TD:O(n²)'],
    ])
  })

  test('quotes and code are tagged as such', () => {
    expect(find('BlockQuote', 'Premature optimization')).toBeDefined()
    expect(find('Code', 'const sorted')).toBeDefined()
  })

  test('text with glyphs the font lacks keeps the original as replacement text', () => {
    const paragraph = find('P', 'Done')!
    expect(paragraph.text).toBe('Done')
    expect(paragraph.alt).toBe('Done 🎉')
  })
})
