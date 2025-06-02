import { Router } from 'express'
import { getAzureOpenAIClient } from '../util/azure/client'
import { z } from 'zod'

const router = Router()

const GetFileParamsSchema = z.object({
  vectorStoreId: z.string(),
  fileId: z.string(),
})

router.get('/:vectorStoreId/:fileId', async (req, res) => {
  const { vectorStoreId, fileId } = GetFileParamsSchema.parse(req.params)
  const client = getAzureOpenAIClient('curredev4omini')

  const asd = await client.vectorStores.files.retrieve(vectorStoreId, fileId)
  console.log('asd', asd)
  if (!asd) {
    res.status(404).send('File not found')
    return
  }

  const fileRes = await client.vectorStores.files.content(vectorStoreId, fileId)
  console.log('fileRes', fileRes)

  const content = fileRes.data?.[0]?.text

  if (!content) {
    res.status(404).send('File not found or empty')
    return
  }

  res.send(content)
})

export default router
