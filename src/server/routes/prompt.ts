import express from 'express'
import type { InferAttributes } from 'sequelize'
import { type PromptCreationParams, PromptCreationParamsSchema, PromptUpdateableParamsSchema } from '../../shared/prompt'
import type { User } from '@shared/user'
import { ChatInstance, Prompt, RagIndex, Responsibility } from '../db/models'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'

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

const authorizePromptCreation = async (user: User, promptParams: PromptCreationParams) => {
  switch (promptParams.type) {
    case 'CHAT_INSTANCE': {
      await authorizeChatInstancePromptResponsible(user, promptParams)
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
    default: {
      throw ApplicationError.InternalServerError('Unknown prompt type')
    }
  }
}

promptRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
  const input = req.body
  input.userId = user.id
  const promptParams = PromptCreationParamsSchema.parse(input)

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
    case 'PERSONAL': {
      if (user.id !== prompt.userId) {
        throw ApplicationError.Forbidden('Not allowed')
      }
      break
    }
    default: {
      throw ApplicationError.InternalServerError('Unknown prompt type')
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
  const updates = PromptUpdateableParamsSchema.parse(req.body)
  const { systemMessage, name, hidden, mandatory, ragIndexId, model, temperature } = updates

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  await authorizePromptUpdate(user, prompt)

  const potentialConflicts = await getPotentialNameConflicts(prompt)
  if (potentialConflicts.some((p) => p.name === name && p.id !== prompt.id)) {
    throw ApplicationError.Conflict('Prompt name already exists')
  }

  prompt.ragIndexId = ragIndexId
  prompt.systemMessage = systemMessage
  prompt.name = name
  prompt.hidden = hidden
  prompt.mandatory = mandatory
  prompt.model = model
  prompt.temperature = temperature

  await prompt.save()

  res.send(prompt)
})

promptRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  // Note: we dont have any authorization checks here. Consider?
  const prompt = await Prompt.findByPk(id, {
    include: [
      {
        model: RagIndex,
        as: 'ragIndex',
      },
    ],
  })

  if (!prompt) {
    // We dont throw error here, since this is expected behaviour when the prompt has been deleted but someone still has it in their local storage.
    res.status(404).send('Prompt not found')
    return
  }

  res.send(prompt)
})

export default promptRouter
