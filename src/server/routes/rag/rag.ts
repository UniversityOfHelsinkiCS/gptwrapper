import { Router } from 'express'
import z from 'zod/v4'
import { ChatInstance, RagFile, RagIndex } from '../../db/models'
import type { RequestWithUser } from '../../types'
import { ApplicationError } from '../../util/ApplicationError'
import ragIndexRouter from './ragIndex'
import { ChatInstanceAccess, getChatInstanceAccess } from '../../services/chatInstances/access'
import { RedisVectorStore } from 'src/server/services/rag/vectorStore'
import { ragIndexMiddleware } from './ragIndexMiddleware'

const router = Router()

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
    ? chatInstance.ragIndices ?? []
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

router.post('/indicesV2', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name, language } = z
    .object({
      name: z.string().min(1).max(100),
      language: z.enum(['Finnish', 'English', 'Swedish']).optional(),
    })
    .parse(req.body)

  const ragIndex = await RagIndex.create({ userId: user.id, metadata: { name, language } })
  await RedisVectorStore.fromRagIndex(ragIndex).createIndex()
  res.json(ragIndex)
})

router.get('/indicesV2', async (req, res) => {
  const { user } = req as RequestWithUser
  const ragIndices = await RagIndex.findAll({
    where: {
      userId: user.id,
    },
  })
  res.json(ragIndices)
})

router.use('/indices/:ragIndexId', [ragIndexMiddleware], ragIndexRouter)

export default router
