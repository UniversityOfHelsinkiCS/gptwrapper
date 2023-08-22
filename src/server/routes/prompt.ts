import express from 'express'

import { Message } from '../types'
import { Prompt } from '../db/models'

const promptRouter = express.Router()

interface NewPromptData {
  serviceId: string
  systemMessage: string
  messages: Message[]
}

// Add access check here
promptRouter.post('/', async (req, res) => {
  const data = req.body as NewPromptData

  const newPrompt = await Prompt.create(data)

  return res.status(201).send(newPrompt)
})

export default promptRouter
