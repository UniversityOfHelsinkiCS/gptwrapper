import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import type { RagFile, RagIndex } from '../../db/models'
import { ApplicationError } from '../../util/ApplicationError'
import { pdfToText } from '../../util/pdfToText'

const RAG_UPLOAD_DIR = 'uploads/rag'

const isPdf = (filePath: string) => filePath.endsWith('.pdf')
const getPdfTextPath = (filePath: string) => `${filePath}.txt`

export const FileStore = {
  getRagIndexPath(ragIndex: RagIndex) {
    return `${RAG_UPLOAD_DIR}/${ragIndex.id}`
  },

  getRagFilePath(ragFile: RagFile) {
    return `${RAG_UPLOAD_DIR}/${ragFile.ragIndexId}/${ragFile.filename}`
  },

  async deleteRagIndexDocuments(ragIndex: RagIndex) {
    const uploadPath = FileStore.getRagIndexPath(ragIndex)
    try {
      await rm(uploadPath, { recursive: true, force: true })
      console.log(`Rag upload directory ${uploadPath} deleted`)
    } catch (error) {
      // @todo check what the error is and then log appropriately.
      console.warn(`Rag upload directory ${uploadPath} not found, nothing to delete --- `, error)
    }
  },

  async deleteRagFileDocument(ragFile: RagFile) {
    const filePath = FileStore.getRagFilePath(ragFile)

    try {
      if (isPdf(filePath)) {
        await unlink(getPdfTextPath(filePath))
      }
    } catch (error) {
      console.error(`Failed to delete file ${getPdfTextPath(filePath)}:`, error)
    }

    try {
      await unlink(filePath)
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error)
      throw ApplicationError.InternalServerError('Failed to delete file')
    }
  },

  async readRagFileTextContent(ragFile: RagFile) {
    const filePath = FileStore.getRagFilePath(ragFile)

    if (isPdf(filePath)) {
      const pdfTextPath = getPdfTextPath(filePath)
      try {
        const text = await readFile(pdfTextPath, 'utf-8')
        return text
      } catch (_error) {
        console.log(`Creating PDF text file ${pdfTextPath}`)

        try {
          const buf = await readFile(filePath)
          const text = await pdfToText(buf)
          await writeFile(pdfTextPath, text, 'utf-8')
          return text
        } catch (error) {
          console.error(`Failed to create PDF text file ${pdfTextPath}:`, error)
          throw ApplicationError.InternalServerError('Failed to create PDF text file')
        }
      }
    }

    try {
      const text = await readFile(filePath, 'utf-8')
      return text
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error)
      throw ApplicationError.InternalServerError('Failed to read file content')
    }
  },

  async createRagIndexDir(ragIndex: RagIndex) {
    const uploadPath = FileStore.getRagIndexPath(ragIndex)
    try {
      await stat(uploadPath)
      console.log(`RAG upload dir exists: ${uploadPath}`)
    } catch (error) {
      console.warn(`RAG upload dir not found, creating ${uploadPath}`)
      await mkdir(uploadPath, { recursive: true })
    }
  },

  async saveText(newFilePath: string, text: string) {
    try {
      await writeFile(newFilePath, text)
    } catch (error) {
      console.error(`Failed to save text content to ${newFilePath}:`, error)
      throw ApplicationError.InternalServerError(`Failed to save text content`)
    }
  },
}
