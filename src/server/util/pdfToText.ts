import pdf from 'pdf-parse-fork'

export const pdfToText = async (fileBuffer: Buffer) => {
  try {
    const data = await pdf(fileBuffer)

    return data.text
  } catch (error) {
    console.log(error)
    throw new Error('Error parsing PDF')
  }
}
