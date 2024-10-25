import express from 'express'

import { Message, RequestWithUser } from '../types'
import { Prompt, ChatInstance, Responsibility } from '../db/models'

const promptRouter = express.Router()

interface NewPromptData {
  chatInstanceId: string
  name: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
  mandatory: boolean
}

promptRouter.get('/:courseId', async (req, res) => {
  const { courseId } = req.params

  const chatInstance = await ChatInstance.findOne({
    where: {
      courseId,
    },
    attributes: ['id'],
  })

  const prompts = await Prompt.findAll({
    where: { chatInstanceId: chatInstance?.id },
    order: [['name', 'ASC']],
  })

  res.send(prompts)
  return
})

const authorizeUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const request = req as RequestWithUser
  const data = req.body as NewPromptData
  const { user } = request
  const { id } = req.params

  const chatInstanceId = id
    ? (await Prompt.findByPk(id)).chatInstanceId
    : data.chatInstanceId

  const chatInstance = (await ChatInstance.findByPk(chatInstanceId, {
    include: [
      {
        model: Responsibility,
        as: 'responsibilities',
      },
    ],
  })) as ChatInstance & { responsibilities: Responsibility[] }

  const isAmongActiveCourses = chatInstance?.responsibilities.some(
    (r) => r.userId === user.id
  )

  if (!isAmongActiveCourses && !user.isAdmin) {
    res.status(403).send('Not allowed')
    return
  }

  next()
  return
}

promptRouter.post('/', authorizeUser, async (req, res) => {
  const data = req.body as NewPromptData

  const newPrompt = await Prompt.create(data)

  res.status(201).send(newPrompt)
})

export default promptRouter

promptRouter.delete('/:id', authorizeUser, authorizeUser, async (req, res) => {
  const { id } = req.params

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    res.status(404).send('Prompt not found')
    return
  }

  await prompt.destroy()

  res.status(204).send()
})

promptRouter.put('/:id', authorizeUser, authorizeUser, async (req, res) => {
  const { id } = req.params
  const data = req.body as Prompt
  const { systemMessage, name, hidden, mandatory } = data

  const prompt = await Prompt.findByPk(id)

  if (!prompt) {
    res.status(404).send('Prompt not found')
    return
  }

  prompt.systemMessage = systemMessage
  prompt.name = name
  prompt.hidden = hidden
  prompt.mandatory = mandatory

  await prompt.save()

  res.send(prompt)
})
