import { Router } from 'express'
import z from 'zod/v4'
import { ChatInstance, ChatInstanceRagIndex, RagFile, RagIndex } from '../../db/models'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import { TEST_COURSES } from '../../../shared/testData'
import ragIndexRouter, { ragIndexMiddleware } from './ragIndex'
import { ChatInstanceAccess, getChatInstanceAccess } from '../../services/chatInstances/access'
import { getRedisVectorStore } from '../../services/rag/vectorStore'

const router = Router()

const IndexCreationSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.enum(['Finnish', 'English']).optional(),
  chatInstanceId: z.string().min(1).max(100),
})

router.post('/indices', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, chatInstanceId, language } = IndexCreationSchema.parse(req.body)

  const chatInstance = await ChatInstance.findByPk(chatInstanceId, {
    include: [
      {
        model: RagIndex,
        as: 'ragIndices',
      },
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Invalid chat instance id')
  }

  if ((await getChatInstanceAccess(user, chatInstance)) < ChatInstanceAccess.TEACHER) {
    throw ApplicationError.Forbidden('Cannot create index, user is not responsible for the course')
  }

  // Only TEST_COURSES allow > 10 rag indices
  const isTestCourse = Object.values(TEST_COURSES).some((course) => course.id === chatInstance.courseId)
  const hasMaxRagIndices = (chatInstance.ragIndices?.length ?? 0) > 10
  if (!isTestCourse && hasMaxRagIndices) {
    throw ApplicationError.Forbidden(`Cannot create index, 10 already exists on the course ${chatInstance.courseId}`)
  }

  const ragIndex = await RagIndex.create({
    userId: user.id,
    metadata: {
      name,
      language,
    },
  })

  await ChatInstanceRagIndex.create({
    chatInstanceId,
    ragIndexId: ragIndex.id,
    userId: user.id,
  })

  const vectorStore = getRedisVectorStore(ragIndex.id, language)
  await vectorStore.createIndex()

  res.json(ragIndex)
})

const GetIndicesQuerySchema = z.object({
  chatInstanceId: z.string().optional(),
  includeExtras: z
    .string()
    .toLowerCase()
    .transform((x) => x === 'true')
    .pipe(z.boolean()),
})

router.get('/indices', async (req, res) => {
  const { chatInstanceId, includeExtras } = GetIndicesQuerySchema.parse(req.query)
  const { user } = req as RequestWithUser

  // Check access
  let chatInstance: ChatInstance | null = null
  if (chatInstanceId) {
    chatInstance = await ChatInstance.findByPk(chatInstanceId, {
      include: [{ model: RagIndex, as: 'ragIndices', required: false }],
    })

    if (!chatInstance) {
      throw ApplicationError.NotFound('Chat instance not found')
    }

    if (!chatInstance.ragIndices?.length) {
      res.json([])
      return
    }

    if ((await getChatInstanceAccess(user, chatInstance)) < ChatInstanceAccess.STUDENT) {
      throw ApplicationError.Forbidden('Not allowed to use rag index. You must be at least an enrolled student.')
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
    const indicesWithCount = await Promise.all(
      indices.map(async (index: any) => {
        const count = await RagFile.count({ where: { ragIndexId: index.id } })
        return { ...index.toJSON(), ragFileCount: count }
      }),
    )

    res.json(indicesWithCount)
    return
  }

  res.json(indices)
})

router.use('/indices/:ragIndexId', [ragIndexMiddleware], ragIndexRouter)

export default router
