import express from 'express'

import { sequelize } from '../db/connection'

import { RequestWithUser } from '../types'
import { ChatInstance, UserChatInstanceUsage, User, Prompt, RagIndex } from '../db/models'
import { statsViewerIams } from '../util/config'
import { generateTerms } from '../util/util'
import { ApplicationError } from '../util/ApplicationError'
import { Statistic, Term } from 'src/shared/types'
import { adminMiddleware } from '../middleware/adminMiddleware'

const statisticsRouter = express.Router()

statisticsRouter.use((req, _, next) => {
  const request = req as RequestWithUser
  const { user } = request

  const isStatsViewer = statsViewerIams.some((iam) => user.iamGroups.includes(iam))
  const isAllowed = user.isAdmin || isStatsViewer

  if (!isAllowed) throw ApplicationError.Forbidden()

  return next()
})

const getUsages = async () => {
  const [usages] = (await sequelize.query(`
    SELECT u.*
    FROM user_chat_instance_usages u
    LEFT JOIN responsibilities r
    ON u.user_id = r.user_id AND u.chat_instance_id = r.chat_instance_id
    WHERE r.user_id IS NULL AND total_usage_count > 0;
  `)) as any[]

  return usages.map((usage) => ({
    id: usage.id,
    userId: usage.user_id,
    usageCount: usage.usage_count, //<--- this get reset
    totalUsageCount: usage.total_usage_count, //<--- this wont get reset
    chatInstanceId: usage.chat_instance_id,
  }))
}

// this function is mostly garbage
statisticsRouter.get('/statistics', [adminMiddleware], async (req, res) => {
  const terms = generateTerms()

  const mangelStats = async () => {
    const usages = await getUsages()

    const courses = {}

    for (const usage of usages) {
      if (!courses[usage.chatInstanceId]) {
        courses[usage.chatInstanceId] = {
          students: 0,
          usedTokens: 0,
        }
      }
      courses[usage.chatInstanceId].students += 1
      courses[usage.chatInstanceId].usedTokens += usage.totalUsageCount //we are interested in how many tokens totally are used in a course
    }

    const getTermsOf = ({ courseActivityPeriod }): Term[] => {
      const checkDateOverlap = (term, course) =>
        new Date(term.startDate) <= new Date(course.endDate || '2112-12-21') && new Date(term.endDate) >= new Date(course.startDate)

      if (!courseActivityPeriod) return []

      return terms.filter((term) => checkDateOverlap(term, courseActivityPeriod))
    }

    function getUniqueValues(array) {
      return array.reduce((acc, value) => {
        if (!acc.includes(value)) {
          acc.push(value)
        }
        return acc
      }, [])
    }

    const extractFields = async (chatInstance: ChatInstance & { prompts: any[] }): Promise<Statistic> => {
      const ragIndicesLength = chatInstance.ragIndices?.length
      const ragIndicesCount = ragIndicesLength ? ragIndicesLength : 0

      const units = chatInstance.courseUnits

      const codes = units.map((u) => u.code)
      const programmes = units.flatMap((item) => item.organisations.map((org) => org.code))
      const terms: Term[] = getTermsOf(chatInstance)
      return {
        startDate: chatInstance.activityPeriod?.startDate,
        endDate: chatInstance.activityPeriod?.endDate,
        terms: terms,
        id: chatInstance.courseId as string,
        name: chatInstance.name,
        codes: getUniqueValues(codes),
        programmes: getUniqueValues(programmes),
        students: courses[chatInstance.id].students,
        usedTokens: courses[chatInstance.id].usedTokens,
        promptCount: chatInstance.prompts.length,
        ragIndicesCount: ragIndicesCount,
      }
    }

    const datas: any[] = []

    for (const courseId of Object.keys(courses)) {
      const chatInstance = (await ChatInstance.findByPk(courseId, {
        include: [
          {
            model: Prompt,
            as: 'prompts',
            attributes: ['id'],
          },
          {
            model: RagIndex,
            as: 'ragIndices',
            required: false,
          },
        ],
      })) as ChatInstance & { prompts: any[] }
      const data: any = await extractFields(chatInstance)
      datas.push(data)
    }

    return datas
  }

  res.send({
    data: await mangelStats(),
    terms,
  })
})

statisticsRouter.get('/chatinstances/usage', async (_, res) => {
  const usage = await UserChatInstanceUsage.findAll({
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: ChatInstance,
        as: 'chatInstance',
      },
    ],
  })

  res.send(usage)
})

statisticsRouter.get('/users', async (_, res) => {
  const usage = await User.findAll({
    attributes: ['id', 'username', 'iamGroups', 'usage'],
  })

  res.send(usage)
})

export default statisticsRouter
