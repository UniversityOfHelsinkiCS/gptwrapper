import { Router } from 'express'
import z from 'zod/v4'
import { EMBED_DIM } from '../../../config'
import { ChatInstance, ChatInstanceRagIndex, RagFile, RagIndex, Responsibility } from '../../db/models'
import type { RequestWithUser, User } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import { getAzureOpenAIClient } from '../../util/azure/client'
import { TEST_COURSES } from '../../util/config'
import ragIndexRouter, { ragIndexMiddleware } from './ragIndex'
import { randomUUID } from 'node:crypto'

const router = Router()

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  chatInstanceId: z.string().min(1).max(100),
  dim: z.number().min(EMBED_DIM).max(EMBED_DIM).default(EMBED_DIM),
})

const hasChatInstanceRagPermission = (user: User, chatInstance: ChatInstance) => {
  const isResponsible = chatInstance.responsibilities?.some((r) => r.userId === user.id)
  return isResponsible || user.isAdmin
}

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, dim, chatInstanceId } = IndexCreationSchema.parse(req.body)

  const chatInstance = await ChatInstance.findByPk(chatInstanceId, {
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        required: true, // Ensure the user is responsible for the course
      },
      {
        model: RagIndex,
        as: 'ragIndices',
      },
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Invalid chat instance id')
  }

  if (!hasChatInstanceRagPermission(user, chatInstance)) {
    throw ApplicationError.Forbidden('Cannot create index, user is not responsible for the course')
  }

  if (chatInstance.courseId !== TEST_COURSES.OTE_SANDBOX.id && (chatInstance.ragIndices ?? []).length > 0) {
    throw ApplicationError.Forbidden('Cannot create index, index already exists on the course')
  }

  const client = getAzureOpenAIClient()
  const vectorStore = await client.vectorStores.create({
    name: `${name}-${user.id}-${chatInstance.id}`,
  })

  const ragIndex = await RagIndex.create({
    userId: user.id,
    metadata: {
      name,
      dim,
      azureVectorStoreId: vectorStore.id,
      ragIndexFilterValue: randomUUID(),
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
  let chatInstance: ChatInstance | null = null
  if (courseId) {
    chatInstance = await ChatInstance.findOne({
      where: { courseId },
      include: [
        { model: Responsibility, as: 'responsibilities' },
        { model: RagIndex, as: 'ragIndices' },
      ],
    })

    if (!chatInstance) {
      throw ApplicationError.NotFound('Chat instance not found')
    }

    if (!chatInstance.ragIndices?.length) {
      res.json([])
      return
    }

    if (!hasChatInstanceRagPermission(user, chatInstance)) {
      throw ApplicationError.Forbidden('Forbidden')
    }
  } else {
    if (!user.isAdmin) {
      res.json([])
      return
    }
  }

  const indices = chatInstance
    ? (chatInstance.ragIndices ?? [])
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
