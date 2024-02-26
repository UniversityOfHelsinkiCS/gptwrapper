import PDFParser from 'pdf2json'

export const parsePdf = (dataBuffer: Buffer): Promise<string> => {
  const pdfParser: any = new PDFParser(this, 1)

  return new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataReady', () => {
      const text = pdfParser.getRawTextContent()
      resolve(text)
    })

    pdfParser.on('pdfParser_dataError', (err: any) => {
      reject(err)
    })

    pdfParser.parseBuffer(dataBuffer)
  })
}
