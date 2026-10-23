import express from 'express'
import type { RequestWithUser } from '../types'
import { ApplicationError } from '../util/ApplicationError'
import crypto from 'crypto'
import { ApiKey } from '../db/models'
import z from 'zod/v4'
import { API_KEY_NAME_MAX_LENGTH, MAX_API_KEYS } from '@shared/apiKey'

const apiKeyRouter = express.Router()

const ApiKeyParamsSchema = z.object({
  apiKeyId: z.uuid(),
})

const ApiKeyPostSchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
})

apiKeyRouter.get('/', async (req, res) => {
  const { user } = req as RequestWithUser

  const apiKeys = await ApiKey.findAll({
    where: { userId: user.id },
    order: [['createdAt', 'DESC']],
  })

  const maskedKeys = apiKeys.map((key) => ({ ...key.toJSON(), apiKey: `••••••••${key.apiKey.slice(-4)}` }))

  res.json(maskedKeys)
})

apiKeyRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser
  const { name } = ApiKeyPostSchema.parse(req.body)

  const apiKeyCount = await ApiKey.count({ where: { userId: user.id } })
  if (apiKeyCount >= MAX_API_KEYS) {
    throw ApplicationError.Conflict('too many api keys')
  }
  const newKey = crypto.randomBytes(32).toString('hex')

  const addedKey = await ApiKey.create({ userId: user.id, apiKey: newKey, name })

  res.status(201).json(addedKey)
})

apiKeyRouter.delete('/:apiKeyId', async (req, res) => {
  const { user } = req as RequestWithUser<{ apiKeyId: string }>
  const { apiKeyId } = ApiKeyParamsSchema.parse(req.params)
  const deletion = await ApiKey.destroy({ where: { id: apiKeyId, userId: user.id } })
  if (deletion === 0) {
    throw ApplicationError.NotFound()
  }
  res.status(204).send()
})

export default apiKeyRouter
