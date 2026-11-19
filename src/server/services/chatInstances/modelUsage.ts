import { mergeUsage, type ModelUsage } from '@shared/usage'
import { sequelize } from '../../db/connection'
import { User, UserChatInstanceUsage } from '../../db/models'

const MODEL_USAGE_ATTRIBUTES = ['id', 'weeklyModelUsage', 'totalModelUsage'] as const

/**
 * Adds one run's usage by model to the user's weekly and total usage, and to their usage row of the course
 * (`UserChatInstanceUsage`) when the run is in a course chat. The rows are locked for the read-merge-write, so
 * concurrent runs of the same user both land.
 */
export const recordModelUsage = async ({ userId, courseUsageId, usage }: { userId: string; courseUsageId?: string | null; usage: ModelUsage }) => {
  if (Object.keys(usage).length === 0) return

  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { attributes: [...MODEL_USAGE_ATTRIBUTES], lock: true, transaction })
    if (!user) throw new Error(`User ${userId} not found`)
    await user.update(
      { weeklyModelUsage: mergeUsage(user.weeklyModelUsage ?? {}, usage), totalModelUsage: mergeUsage(user.totalModelUsage ?? {}, usage) },
      { transaction },
    )

    if (!courseUsageId) return
    const courseUsage = await UserChatInstanceUsage.findByPk(courseUsageId, { attributes: [...MODEL_USAGE_ATTRIBUTES], lock: true, transaction })
    if (!courseUsage) throw new Error(`UserChatInstanceUsage ${courseUsageId} not found`)
    await courseUsage.update(
      {
        weeklyModelUsage: mergeUsage(courseUsage.weeklyModelUsage ?? {}, usage),
        totalModelUsage: mergeUsage(courseUsage.totalModelUsage ?? {}, usage),
      },
      { transaction },
    )
  })
}
