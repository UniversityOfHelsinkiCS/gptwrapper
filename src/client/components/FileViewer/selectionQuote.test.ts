import { afterEach, describe, expect, test } from 'vitest'
import { MAX_QUOTE_LENGTH } from '@shared/quote'
import { headingInView, nearestHeading, pdfPageOf, selectionToQuote } from './selectionQuote'

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.innerHTML = ''
})

const setup = (html: string) => {
  document.body.innerHTML = `<header><h2 id="title">notes.md</h2></header><div id="content">${html}</div><p id="outside">Outside text</p>`
  return document.getElementById('content')!
}

/** Selects from the start of `from`'s text to the end of `to`'s text (both text-holding elements). */
const select = (from: Element, to: Element = from, { startOffset = 0 }: { startOffset?: number } = {}) => {
  const range = document.createRange()
  range.setStart(from.firstChild!, startOffset)
  range.setEnd(to.firstChild!, to.firstChild!.textContent!.length)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return selection
}

const byId = (id: string) => document.getElementById(id)!

describe('selectionToQuote', () => {
  test('makes a trimmed text quote with the full path', () => {
    const content = setup('<pre id="text">   Some quoted text  \n</pre>')
    expect(selectionToQuote(select(byId('text')), content, 'Course/week3/notes.txt')).toEqual({
      quote: { kind: 'text', path: 'Course/week3/notes.txt', text: 'Some quoted text' },
      truncated: false,
    })
  })

  test('takes the nearest preceding heading', () => {
    const content = setup('<h1>Week 3</h1><p id="a">Intro</p><h2>2.3 Eigenvalues</h2><p id="b">An eigenvector</p><h2>2.4 Next</h2><p id="c">Later</p>')
    expect(selectionToQuote(select(byId('b')), content, 'notes.md')?.quote.heading).toBe('2.3 Eigenvalues')
    expect(selectionToQuote(select(byId('a')), content, 'notes.md')?.quote.heading).toBe('Week 3')
  })

  test('uses the heading where the selection starts, also when it starts inside a heading', () => {
    const content = setup('<h2 id="h">Section A</h2><p id="b">Body</p><h2>Section B</h2><p id="c">More</p>')
    expect(selectionToQuote(select(byId('h'), byId('c')), content, 'notes.md')?.quote.heading).toBe('Section A')
  })

  test('has no heading before the first heading', () => {
    const content = setup('<p id="a">Before</p><h1>Title</h1>')
    expect(selectionToQuote(select(byId('a')), content, 'notes.md')?.quote).not.toHaveProperty('heading')
  })

  test('caps the text and marks it truncated', () => {
    const content = setup(`<pre id="text">${'a'.repeat(MAX_QUOTE_LENGTH + 50)}</pre>`)
    const pending = selectionToQuote(select(byId('text')), content, 'big.txt')!
    expect(pending.quote.text.length).toBe(MAX_QUOTE_LENGTH)
    expect(pending.truncated).toBe(true)
  })

  test('ignores selections that extend outside the content, or are empty', () => {
    const content = setup('<p id="a">Inside</p>')
    expect(selectionToQuote(select(byId('a'), byId('outside')), content, 'notes.md')).toBe(null)
    expect(selectionToQuote(select(byId('title'), byId('a')), content, 'notes.md')).toBe(null)
    expect(selectionToQuote(select(byId('outside')), content, 'notes.md')).toBe(null)

    const blank = setup('<pre id="text">   </pre>')
    expect(selectionToQuote(select(byId('text')), blank, 'notes.txt')).toBe(null)
    document.getSelection()!.removeAllRanges()
    expect(selectionToQuote(document.getSelection(), blank, 'notes.txt')).toBe(null)
  })

  test('takes the page from `pageOf` instead of a heading', () => {
    const content = setup('<h1>Heading</h1><div data-page-number="2"><span id="a">Page text</span></div>')
    const pending = selectionToQuote(select(byId('a')), content, 'lecture.pdf', {
      pageOf: (node) => Number(node.parentElement!.closest<HTMLElement>('[data-page-number]')!.dataset.pageNumber),
    })
    expect(pending?.quote).toEqual({ kind: 'text', path: 'lecture.pdf', page: 2, text: 'Page text' })
  })
})

/** Two pages as pdf.js's viewer renders them: page containers with a text layer of spans. */
const PDF_PAGES =
  '<div class="pdfViewer">' +
  '<div class="page" data-page-number="1" role="region"><div class="textLayer"><span id="p1a">First page line.</span><span id="p1b">End of page one.</span></div></div>' +
  '<div class="page" data-page-number="2" role="region"><div class="textLayer"><span id="p2a">Second page line.</span></div></div>' +
  '</div>'

describe('pdfPageOf', () => {
  test('is the page number of the page container around a node', () => {
    setup(PDF_PAGES)
    expect(pdfPageOf(byId('p1a').firstChild!)).toBe(1)
    expect(pdfPageOf(byId('p2a'))).toBe(2)
    expect(pdfPageOf(document.querySelector('.pdfViewer')!)).toBe(undefined)
    expect(pdfPageOf(byId('outside').firstChild!)).toBe(undefined)
  })

  test('gives a PDF selection the page where it starts, also when it spans two pages', () => {
    const content = setup(PDF_PAGES)
    expect(selectionToQuote(select(byId('p2a')), content, 'book.pdf', { pageOf: pdfPageOf })?.quote).toEqual({
      kind: 'text',
      path: 'book.pdf',
      page: 2,
      text: 'Second page line.',
    })
    const spanning = selectionToQuote(select(byId('p1b'), byId('p2a')), content, 'book.pdf', { pageOf: pdfPageOf })
    expect(spanning?.quote.page).toBe(1)
    expect(spanning?.quote.text).toBe('End of page one.Second page line.')
  })
})

describe('nearestHeading', () => {
  test('is undefined without headings', () => {
    const content = setup('<p id="a">Text</p>')
    expect(nearestHeading(content, byId('a'))).toBe(undefined)
  })
})

describe('headingInView', () => {
  test('is the last heading starting above the top of the visible area, or just below it', () => {
    const content = setup('<h1 id="h1">Intro</h1><p>a</p><h2 id="h2">  Part 2 </h2><p>b</p><h3 id="h3">Part 3</h3>')
    const tops: Record<string, number> = { h1: -400, h2: -100, h3: 200 }
    for (const [id, top] of Object.entries(tops)) byId(id).getBoundingClientRect = () => ({ top }) as DOMRect
    expect(headingInView(content, 0)).toBe('Part 2')
    expect(headingInView(content, 190)).toBe('Part 3')
    expect(headingInView(content, -500)).toBe(undefined)
  })
})
