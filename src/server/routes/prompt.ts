import express from 'express'
import z from 'zod/v4'
import { ChatInstance, Prompt, RagIndex, Responsibility } from '../db/models'
import type { RequestWithUser } from '../types'
import type { User } from '../../shared/user'
import { ApplicationError } from '../util/ApplicationError'
import { InferAttributes } from 'sequelize'

const promptRouter = express.Router()

promptRouter.get('/my-prompts', async (req, res) => {
  const { user } = req as RequestWithUser

  const myPrompts = await Prompt.findAll({
    where: {
      userId: user.id,
      type: 'PERSONAL',
    },
    order: [['name', 'ASC']],
  })

  res.send(myPrompts)
  return
})

promptRouter.get('/for-course/:courseId', async (req, res) => {
  const { courseId } = req.params

  // Note: we dont have any authorization checks here. Consider?
  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['id'],
    include: {
      model: Prompt,
      as: 'prompts',
      separate: true,
      order: [['createdAt', 'ASC']],
    },
  })

  const prompts = chatInstance?.prompts || []

  res.send(prompts)
  return
})

const PromptUpdateableParams = z.object({
  name: z.string().min(1).max(255),
  systemMessage: z.string().max(20_000),
  hidden: z.boolean().default(false),
  mandatory: z.boolean().default(false),
})

const PromptCreationParams = z.intersection(
  PromptUpdateableParams.extend({
    userId: z.string().min(1),
    messages: z
      .array(
        z.object({
          role: z.enum(['system', 'assistant', 'user']),
          content: z.string().min(1),
        }),
      )
      .default([]),
  }),
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('CHAT_INSTANCE'),
      chatInstanceId: z.string().min(1),
    }),
    z.object({
      type: z.literal('PERSONAL'),
    }),
    z.object({
      type: z.literal('RAG_INDEX'),
      ragIndexId: z.number().min(1),
      chatInstanceId: z.string().min(1).optional(),
    }),
  ]),
)

type PromptCreationParamsType = z.infer<typeof PromptCreationParams>

const getPotentialNameConflicts = async (prompt: InferAttributes<Prompt, { omit: 'id' }>) => {
  switch (prompt.type) {
    case 'CHAT_INSTANCE': {
      return await Prompt.findAll({
        attributes: ['id', 'name'],
        where: {
          chatInstanceId: prompt.chatInstanceId,
        },
      })
    }
    case 'PERSONAL': {
      return await Prompt.findAll({
        attributes: ['id', 'name'],
        where: {
          userId: prompt.userId,
        },
      })
    }
    case 'RAG_INDEX': {
      return Prompt.findAll({
        attributes: ['id', 'name'],
        where: {
          ragIndexId: prompt.ragIndexId,
        },
      })
    }
  }
}

interface ChatInstancePrompt {
  chatInstanceId: string
}

const authorizeChatInstancePromptResponsible = async (user: User, prompt: ChatInstancePrompt) => {
  const chatInstance = await ChatInstance.findByPk(prompt.chatInstanceId, {
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
        attributes: ['id', 'userId'],
      },
    ],
  })

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  const isResponsible = chatInstance.responsibilities?.some((r) => r.userId === user.id)

  if (!isResponsible && !user.isAdmin) {
    throw ApplicationError.Forbidden('Not allowed')
  }
}

interface RagIndexPrompt {
  ragIndexId: number
  chatInstanceId?: string
}

const authorizeRagIndexPromptResponsible = async (user: User, prompt: RagIndexPrompt) => {
  const ragIndex = await RagIndex.findByPk(prompt.ragIndexId)
  const isAuthor = ragIndex?.userId === user.id

  if (!isAuthor && !user.isAdmin) {
    if (!prompt.chatInstanceId) {
      throw ApplicationError.Forbidden('Not allowed')
    }
    await authorizeChatInstancePromptResponsible(user, prompt as ChatInstancePrompt)
  }
}

const authorizePromptCreation = async (user: User, promptParams: PromptCreationParamsType) => {
  switch (promptParams.type) {
    case 'CHAT_INSTANCE': {
      await authorizeChatInstancePromptResponsible(user, promptParams)
      break
    }
    case 'RAG_INDEX': {
      await authorizeRagIndexPromptResponsible(user, promptParams)
      break
    }
    case 'PERSONAL': {
      // This is fine. Anyone can create a personal prompt. Lets just limit the number of prompts per user to 200
      const count = await Prompt.count({ where: { userId: user.id } })
      if (count >= 200) {
        throw ApplicationError.Forbidden('Maximum number of prompts reached')
      }
      break
    }
  }
}

promptRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
  const input = req.body
  input.userId = user.id
  const promptParams = PromptCreationParams.parse(input)

  await authorizePromptCreation(user, promptParams)

  const potentialConflicts = await getPotentialNameConflicts(promptParams)
  if (potentialConflicts.some((p) => p.name === promptParams.name)) {
    throw ApplicationError.Conflict('Prompt name already exists')
  }

  const newPrompt = await Prompt.create(promptParams)

  res.status(201).send(newPrompt)
})

const authorizePromptUpdate = async (user: User, prompt: Prompt) => {
  switch (prompt.type) {
    case 'CHAT_INSTANCE': {
      await authorizeChatInstancePromptResponsible(user, prompt as ChatInstancePrompt)
      break
    }
    case 'RAG_INDEX': {
      await authorizeRagIndexPromptResponsible(user, prompt as RagIndexPrompt)
      break
    }
    case 'PERSONAL': {
      if (user.id !== prompt.userId) {
        throw ApplicationError.Forbidden('Not allowed')
      }
      break
    }
  }
}

promptRouter.delete('/:id', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const { id } = req.params

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  await authorizePromptUpdate(user, prompt)

  await prompt.destroy()

  res.status(204).send()
})

promptRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { user } = req as unknown as RequestWithUser
  const updates = PromptUpdateableParams.parse(req.body)
  const { systemMessage, name, hidden, mandatory } = updates

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  await authorizePromptUpdate(user, prompt)

  const potentialConflicts = await getPotentialNameConflicts(prompt)
  if (potentialConflicts.some((p) => p.name === name && p.id !== prompt.id)) {
    throw ApplicationError.Conflict('Prompt name already exists')
  }

  prompt.systemMessage = systemMessage
  prompt.name = name
  prompt.hidden = hidden
  prompt.mandatory = mandatory

  await prompt.save()

  res.send(prompt)
})

promptRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  // Note: we dont have any authorization checks here. Consider?
  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    // We dont throw error here, since this is expected behaviour when the prompt has been deleted but someone still has it in their local storage.
    res.status(404).send('Prompt not found')
    return
  }

  res.send(prompt)
})

export default promptRouter
