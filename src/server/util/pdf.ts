import PDFParser from 'pdf2json'

export const parsePdf = (dataBuffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    const pdfParser: any = new PDFParser(this, 1)

    pdfParser.on('pdfParser_dataReady', () => {
      const text = pdfParser.getRawTextContent()
      resolve(text)
    })

    pdfParser.on('pdfParser_dataError', (err: any) => {
      reject(err)
    })

    pdfParser.parseBuffer(dataBuffer)
  })
