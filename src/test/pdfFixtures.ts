import { jsPDF } from 'jspdf'

/**
 * Small PDFs for tests, made with jsPDF so they are not checked in. The same input gives the same text layer (the
 * bytes differ only by jsPDF's creation date and file id, which the tests do not depend on).
 */

/**
 * A PDF whose page n (1-based) has the lines of `pages[n - 1]` as text. Lines below the page are left out, so a long
 * page needs a small `fontSize` (about 150 lines fit at 4 pt).
 */
export const makeTextPdf = (pages: string[][], options: { password?: string; fontSize?: number } = {}): Uint8Array => {
  const fontSize = options.fontSize ?? 12
  const doc = new jsPDF({
    compress: false,
    ...(options.password ? { encryption: { userPassword: options.password, ownerPassword: options.password, userPermissions: ['print'] } } : {}),
  })
  doc.setFontSize(fontSize)
  pages.forEach((lines, index) => {
    if (index > 0) doc.addPage()
    lines.forEach((line, n) => doc.text(line, 10, 10 + n * fontSize * 0.45))
  })
  return new Uint8Array(doc.output('arraybuffer'))
}

/** A "scanned" PDF: pages with only drawn shapes, no text layer. */
export const makeNoTextPdf = (pageCount = 2): Uint8Array => {
  const doc = new jsPDF({ compress: false })
  for (let n = 0; n < pageCount; n++) {
    if (n > 0) doc.addPage()
    doc.setFillColor(40, 40, 40)
    doc.rect(10, 10, 100, 40, 'F')
    doc.circle(60, 100, 20, 'F')
  }
  return new Uint8Array(doc.output('arraybuffer'))
}
