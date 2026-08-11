import express from 'express'
import { Op } from 'sequelize'
import type { RequestWithUser } from '../types'
import { UniversityPrompt, Prompt } from '../db/models'
import { sequelize } from '../db/connection'
import { UniversityPromptBodySchema } from '../../shared/prompt'
import { ApplicationError } from '../util/ApplicationError'

const uniPromptRouter = express.Router()

const getUniPrompts = async () => {
  return UniversityPrompt.findAll({
    where: {
      [Op.or]: [{ fi: { [Op.not]: null } }, { en: { [Op.not]: null } }, { sv: { [Op.not]: null } }],
    },
    include: [
      { model: Prompt, as: 'fiPrompt', required: false },
      { model: Prompt, as: 'enPrompt', required: false },
      { model: Prompt, as: 'svPrompt', required: false },
    ],
    order: [['createdAt', 'ASC']],
  })
}

uniPromptRouter.get('/', async (_req, res) => {
  const uniPrompts = await getUniPrompts()
  res.send(uniPrompts)
})

uniPromptRouter.post('/', async (req, res) => {
  const { user } = req as RequestWithUser

  if (!user.isAdmin) {
    throw ApplicationError.Forbidden('Not allowed')
  }

  const input = UniversityPromptBodySchema.parse(req.body)

  const createdUniversityPrompt = await sequelize.transaction(async (transaction) => {
    const [fiPrompt, enPrompt, svPrompt] = await Promise.all([
      Prompt.create(
        {
          ...input.fi,
          userId: user.id,
          type: input.fi.type,
        },
        { transaction },
      ),
      Prompt.create(
        {
          ...input.en,
          userId: user.id,
          type: input.en.type,
        },
        { transaction },
      ),
      Prompt.create(
        {
          ...input.sv,
          userId: user.id,
          type: input.sv.type,
        },
        { transaction },
      ),
    ])

    return UniversityPrompt.create(
      {
        fi: fiPrompt.id,
        en: enPrompt.id,
        sv: svPrompt.id,
      },
      { transaction },
    )
  })

  const fullUniversityPrompt = await UniversityPrompt.findByPk(createdUniversityPrompt.id, {
    include: [
      { model: Prompt, as: 'fiPrompt', required: false },
      { model: Prompt, as: 'enPrompt', required: false },
      { model: Prompt, as: 'svPrompt', required: false },
    ],
  })

  res.status(201).send(fullUniversityPrompt)
})

export default uniPromptRouter
