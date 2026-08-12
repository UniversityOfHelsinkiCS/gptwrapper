import express from 'express'
import { Op, type Transaction } from 'sequelize'
import type { RequestWithUser } from '../types'
import { UniversityPrompt, Prompt } from '../db/models'
import { PromptLanguageValues, type PromptLanguage } from '../db/models/prompt'
import { sequelize } from '../db/connection'
import { UniversityPromptBodySchema, type UniversityPromptType } from '../../shared/prompt'
import { ApplicationError } from '../util/ApplicationError'
import { adminMiddleware } from '../middleware/adminMiddleware'
import { z } from 'zod/v4'

const uniPromptRouter = express.Router()

type UniversityPromptBodyInput = z.output<typeof UniversityPromptBodySchema>
type LanguageParams = NonNullable<UniversityPromptBodyInput['fi']>

const promptsInclude = [{ model: Prompt, as: 'prompts', required: false }]

const findUniversityPrompt = async (id: string) => {
  const uniPrompt = await UniversityPrompt.findByPk(id, { include: promptsInclude })

  if (!uniPrompt) {
    throw ApplicationError.NotFound('University prompt not found')
  }

  return uniPrompt
}

const suppliedLanguages = (body: UniversityPromptBodyInput) => PromptLanguageValues.filter((language) => Boolean(body[language]))

const assertNameIsFree = async (
  { name, type, language }: { name: string; type: UniversityPromptType; language: PromptLanguage },
  { excludeGroupId, transaction }: { excludeGroupId?: string; transaction?: Transaction } = {},
) => {
  const conflict = await Prompt.findOne({
    attributes: ['id'],
    where: {
      name,
      type,
      language,
      universityPromptId: {
        [Op.not]: null,
        ...(excludeGroupId ? { [Op.ne]: excludeGroupId } : {}),
      },
    },
    transaction,
  })

  if (conflict) {
    throw ApplicationError.Conflict(`A ${type.toLowerCase()} prompt named "${name}" already exists in ${language}`)
  }
}

const buildPromptAttributes = (params: LanguageParams, context: { language: PromptLanguage; type: UniversityPromptType; userId: string }) => ({
  name: params.name,
  userInstructions: params.userInstructions,
  systemMessage: params.systemMessage,
  messages: params.messages,
  type: context.type,
  language: context.language,
  userId: context.userId,
  // Prompt.hidden defaults to true; university prompts are meant to be read.
  hidden: false,
  ragHidden: false,
  ragIndexId: null,
})

uniPromptRouter.get('/', async (req, res) => {
  const { user } = req as RequestWithUser

  const uniPrompts = await UniversityPrompt.findAll({
    where: user.isAdmin ? {} : { published: true },
    include: promptsInclude,
    order: [['createdAt', 'ASC']],
  })

  res.send(uniPrompts)
})

uniPromptRouter.post('/', adminMiddleware, async (req, res) => {
  const { user } = req as RequestWithUser
  const body = UniversityPromptBodySchema.parse(req.body)
  const languages = suppliedLanguages(body)

  const created = await sequelize.transaction(async (transaction) => {
    const group = await UniversityPrompt.create({ published: body.published ?? false }, { transaction })

    for (const language of languages) {
      const params = body[language] as LanguageParams

      await assertNameIsFree({ name: params.name, type: body.type, language }, { transaction })

      await Prompt.create(
        {
          ...buildPromptAttributes(params, { language, type: body.type, userId: user.id }),
          universityPromptId: group.id,
        },
        { transaction },
      )
    }

    return group
  })

  const fullUniversityPrompt = await findUniversityPrompt(created.id)

  res.status(201).send(fullUniversityPrompt)
})

uniPromptRouter.put('/:id', adminMiddleware, async (req, res) => {
  const { user } = req as RequestWithUser
  const id = String(req.params.id)
  const body = UniversityPromptBodySchema.parse(req.body)

  const group = await findUniversityPrompt(id)

  await sequelize.transaction(async (transaction) => {
    const existing = await Prompt.findAll({ where: { universityPromptId: group.id }, transaction })

    for (const language of PromptLanguageValues) {
      const params = body[language]
      const current = existing.find((prompt) => prompt.language === language)

      if (!params) {
        // Language dropped from the group.
        if (current) {
          await current.destroy({ transaction })
        }
        continue
      }

      await assertNameIsFree({ name: params.name, type: body.type, language }, { excludeGroupId: group.id, transaction })

      if (current) {
        Object.assign(current, buildPromptAttributes(params, { language, type: body.type, userId: current.userId ?? user.id }))
        await current.save({ transaction })
      } else {
        await Prompt.create(
          {
            ...buildPromptAttributes(params, { language, type: body.type, userId: user.id }),
            universityPromptId: group.id,
          },
          { transaction },
        )
      }
    }

    if (body.published !== undefined) {
      group.published = body.published
      await group.save({ transaction })
    }
  })

  const fullUniversityPrompt = await findUniversityPrompt(group.id)

  res.send(fullUniversityPrompt)
})

uniPromptRouter.delete('/:id', adminMiddleware, async (req, res) => {
  const id = String(req.params.id)

  const group = await findUniversityPrompt(id)

  // Child prompts go with it: the FK is ON DELETE CASCADE.
  await group.destroy()

  res.status(204).send()
})

export default uniPromptRouter
