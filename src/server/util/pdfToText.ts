// eslint-disable-next-line import/no-extraneous-dependencies
import pdf from 'pdf-parse-fork'

export const pdfToText = async (fileBuffer: Buffer) => {
  try {
    const data = await pdf(fileBuffer)

    return data.text
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Error parsing PDF')
  }
}
