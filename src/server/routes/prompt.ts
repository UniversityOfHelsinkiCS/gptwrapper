import express from 'express'

import { Message } from '../types'
import { Prompt } from '../db/models'

const promptRouter = express.Router()

interface NewPromptData {
  serviceId: string
  systemMessage: string
  messages: Message[]
}

promptRouter.get('/:serviceId', async (req, res) => {
  const { serviceId } = req.params

  const prompts = await Prompt.findAll({
    where: { serviceId },
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
