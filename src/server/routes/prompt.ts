import express from 'express'

import { Message } from '../types'
import { Prompt, ChatInstance } from '../db/models'

const promptRouter = express.Router()

interface NewPromptData {
  chatInstanceId: string
  name: string
  systemMessage: string
  messages: Message[]
  hidden: boolean
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
  })

  return res.send(prompts)
})

promptRouter.post('/', async (req, res) => {
  const data = req.body as NewPromptData

  const newPrompt = await Prompt.create(data)

  return res.status(201).send(newPrompt)
})

export default promptRouter

promptRouter.delete('/:id', async (req, res) => {
  const { id } = req.params

  const prompt = await Prompt.findByPk(id)

  if (!prompt) return res.status(404).send('Prompt not found')

  await prompt.destroy()

  return res.status(204).send()
})

promptRouter.put('/:id', async (req, res) => {
  const { id } = req.params
  const data = req.body as Prompt
  const { systemMessage } = data

  const prompt = await Prompt.findByPk(id)

  if (!prompt) return res.status(404).send('Prompt not found')

  prompt.systemMessage = systemMessage

  await prompt.save()

  return res.send(prompt)
})
