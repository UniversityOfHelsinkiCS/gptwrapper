import { Router } from 'express'
import { EMBED_DIM } from '../../../config'
import { ChatInstance, ChatInstanceRagIndex, RagFile, RagIndex, Responsibility } from '../../db/models'
import { RequestWithUser, User } from '../../types'
import z from 'zod/v4'
import { getAzureOpenAIClient } from '../../util/azure/client'
import ragIndexRouter, { ragIndexMiddleware } from './ragIndex'

const router = Router()

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  chatInstanceId: z.string().min(1).max(100),
  dim: z.number().min(EMBED_DIM).max(EMBED_DIM).default(EMBED_DIM),
})

const hasChatInstanceRagPermission = (user: User, chatInstance: ChatInstance) => {
  const isResponsible = chatInstance.responsibilities.some((r) => r.userId === user.id)
  return isResponsible || user.isAdmin
}

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, dim, chatInstanceId } = IndexCreationSchema.parse(req.body)

  const chatInstance = await ChatInstance.findByPk(chatInstanceId, {
    include: {
      model: Responsibility,
      as: 'responsibilities',
      required: true, // Ensure the user is responsible for the course
    },
  })

  if (!chatInstance) {
    res.status(404).json({
      error: 'Course not found',
    })
    return
  }

  if (!hasChatInstanceRagPermission(user, chatInstance)) {
    res.status(403).json({ error: 'Cannot create index, user is not responsible for the course' })
  }

  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.create({
    name,
  })

  const ragIndex = await RagIndex.create({
    userId: user.id,
    metadata: {
      name,
      dim,
      azureVectorStoreId: vectorStore.id,
    },
  })

  await ChatInstanceRagIndex.create({
    chatInstanceId,
    ragIndexId: ragIndex.id,
    userId: user.id,
  })

  res.json(ragIndex)
})

const GetIndicesQuerySchema = z.object({
  courseId: z.string().optional(),
  includeExtras: z
    .string()
    .toLowerCase()
    .transform((x) => x === 'true')
    .pipe(z.boolean()),
})

router.get('/indices', async (req, res) => {
  const { courseId, includeExtras } = GetIndicesQuerySchema.parse(req.query)
  const { user } = req as RequestWithUser

  // Check access
  let chatInstance: ChatInstance | undefined
  if (courseId) {
    chatInstance = await ChatInstance.findOne({
      where: { courseId },
      include: [
        { model: Responsibility, as: 'responsibilities' },
        { model: RagIndex, as: 'ragIndices' },
      ],
    })
    if (!hasChatInstanceRagPermission(user, chatInstance)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  } else {
    if (!user.isAdmin) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
  }

  const indices = chatInstance
    ? chatInstance.ragIndices
    : await RagIndex.findAll({
        include: [
          {
            model: RagFile,
            as: 'ragFiles',
            attributes: ['id', 'filename'],
          },
        ],
      })

  if (includeExtras) {
    const client = getAzureOpenAIClient()

    // Add ragFileCount to each index
    const indicesWithCount = await Promise.all(
      indices.map(async (index: any) => {
        const vectorStore = await client.vectorStores.retrieve(index.metadata.azureVectorStoreId)
        const count = await RagFile.count({ where: { ragIndexId: index.id } })
        return { ...index.toJSON(), ragFileCount: count, vectorStore }
      }),
    )

    res.json(indicesWithCount)
    return
  }

  res.json(indices)
})

router.use('/indices/:ragIndexId', [ragIndexMiddleware], ragIndexRouter)

export default router
