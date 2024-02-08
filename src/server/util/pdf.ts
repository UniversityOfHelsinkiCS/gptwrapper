import fs from 'fs'

import pdf from 'pdf-parse'

export const parsePdf = async (path: string) => {
  const dataBuffer = fs.readFileSync(path)
  const data = await pdf(dataBuffer)

  return data.text
}
