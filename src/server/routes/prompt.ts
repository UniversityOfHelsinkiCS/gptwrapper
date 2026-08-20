import express from 'express'
import type { InferAttributes } from 'sequelize'
import { PromptCopyParamsSchema, PromptCreationParamsSchema, PromptUpdateableParamsSchema } from '../../shared/prompt'
import { canCopyPrompt } from '../../shared/promptPermissions'
import { resolveCopyName, shouldKeepRagIndex } from '../util/promptCopy'
import type { User } from '@shared/user'
import { ChatInstance, Prompt, RagIndex, Responsibility, PromptChatInstance } from '../db/models'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'
import logger from '../util/logger'
import { z } from 'zod/v4'

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
          type: 'PERSONAL',
        },
      })
    }
    default: {
      return []
    }
  }
}

interface ChatInstancePrompt {
  chatInstanceId: string
}

const isResponsibleForChatInstance = async (user: User, chatInstanceId: string) => {
  const chatInstance = await ChatInstance.findByPk(chatInstanceId, {
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

  return chatInstance.responsibilities?.some((r) => r.userId === user.id) ?? false
}

const authorizeChatInstancePromptResponsible = async (user: User, prompt: ChatInstancePrompt) => {
  const isResponsible = await isResponsibleForChatInstance(user, prompt.chatInstanceId)

  if (!isResponsible && !user.isAdmin) {
    throw ApplicationError.Forbidden('Not allowed')
  }
}

const authorizeChatInstancePromptCreator = async (user: User, prompt: Prompt) => {
  const chatInstance = await ChatInstance.findByPk(prompt.chatInstanceId)

  if (!chatInstance) {
    throw ApplicationError.NotFound('Chat instance not found')
  }

  const isCreator = user.id === prompt.userId

  if (!isCreator && !user.isAdmin) {
    throw ApplicationError.Forbidden('Not allowed')
  }
}

const authorizePromptCreation = async (user: User, promptParams: z.output<typeof PromptCreationParamsSchema>) => {
  switch (promptParams.type) {
    case 'CHAT_INSTANCE': {
      await authorizeChatInstancePromptResponsible(user, promptParams)
      break
    }
    case 'PERSONAL': {
      // This is fine. Anyone can create a personal prompt. Lets just limit the number of prompts per user to 200
      const count = await Prompt.count({ where: { userId: user.id, type: 'PERSONAL' } })
      if (count >= 200) {
        throw ApplicationError.Forbidden('Maximum number of prompts reached')
      }
      break
    }
    default: {
      throw ApplicationError.Forbidden('Not allowed')
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

  const chatInstanceID = input.chatInstanceId

  if (chatInstanceID) {
    await PromptChatInstance.create({
      promptId: newPrompt.id,
      chatInstanceId: chatInstanceID,
    })
  }

  res.status(201).send(newPrompt)
})

promptRouter.post('/:id/copy', async (req, res) => {
  const { user } = req as unknown as RequestWithUser
  const { id } = req.params
  const { target, name } = PromptCopyParamsSchema.parse(req.body)

  const source = await Prompt.findByPk(id, {
    include: [
      {
        model: RagIndex,
        as: 'ragIndex',
        required: false,
      },
    ],
  })

  if (!source) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  if (source.type === 'UNIVERSITY') {
    throw ApplicationError.Forbidden('University prompts cannot be copied')
  }

  const isResponsibleForSource =
    source.type === 'CHAT_INSTANCE' && source.chatInstanceId ? await isResponsibleForChatInstance(user, source.chatInstanceId) : false

  if (
    !canCopyPrompt({
      isAdmin: user.isAdmin,
      isOwner: source.userId === user.id,
      isResponsible: isResponsibleForSource,
      isUniversityTemplate: source.type === 'TEMPLATE',
    })
  ) {
    throw ApplicationError.Forbidden('Not allowed')
  }

  const keepRagIndex = shouldKeepRagIndex(source.ragIndex?.userId, user.id)

  const base = {
    userId: user.id,
    name: name ?? source.name,
    userInstructions: source.userInstructions ?? '',
    systemMessage: source.systemMessage,
    // The rag system messages are meaningless without the index they instruct.
    messages: keepRagIndex ? source.messages : [],
    hidden: source.hidden,
    ragHidden: source.ragHidden,
    ragIndexId: keepRagIndex ? source.ragIndexId ?? null : null,
  }

  const copyParams =
    target.type === 'CHAT_INSTANCE'
      ? { ...base, type: 'CHAT_INSTANCE' as const, chatInstanceId: target.chatInstanceId }
      : { ...base, type: 'PERSONAL' as const }

  await authorizePromptCreation(user, copyParams)

  const potentialConflicts = await getPotentialNameConflicts(copyParams)

  const newPrompt = await Prompt.create({
    ...copyParams,
    name: resolveCopyName(
      potentialConflicts.map((p) => p.name),
      copyParams.name,
    ),
  })

  if (target.type === 'CHAT_INSTANCE') {
    await PromptChatInstance.create({
      promptId: newPrompt.id,
      chatInstanceId: target.chatInstanceId,
    })
  }

  logger.info('PromptCopy', {
    sourcePromptId: source.id,
    sourceType: source.type,
    targetType: copyParams.type,
    language: source.language ?? null,
    userId: user.id,
  })

  res.status(201).send(newPrompt)
})

const authorizePromptUpdate = async (user: User, prompt: Prompt) => {
  switch (prompt.type) {
    case 'CHAT_INSTANCE': {
      await authorizeChatInstancePromptCreator(user, prompt)
      break
    }
    case 'PERSONAL': {
      if (user.id !== prompt.userId) {
        throw ApplicationError.Forbidden('Not allowed')
      }
      break
    }
    default: {
      throw ApplicationError.Forbidden('Not allowed')
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

  await PromptChatInstance.destroy({ where: { promptId: prompt.id } })

  res.status(204).send()
})

promptRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const { user } = req as unknown as RequestWithUser
  const updates = PromptUpdateableParamsSchema.parse(req.body)

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    throw ApplicationError.NotFound('Prompt not found')
  }

  await authorizePromptUpdate(user, prompt)

  const potentialConflicts = await getPotentialNameConflicts(prompt)
  if (potentialConflicts.some((p) => p.name === updates.name && p.id !== prompt.id)) {
    throw ApplicationError.Conflict('Prompt name already exists')
  }

  Object.assign(prompt, updates)

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
