import { Op, literal } from 'sequelize'

import { User } from '../../db/models'
import { usageCost, type UsageComparisonRow } from '../../../shared/usage'
import { budgetOfCourses, getActiveCourseMembershipsByUser, tokenLimitOfCourses } from './usage'

const percent = (used: number, limit: number) => (limit > 0 ? (used / limit) * 100 : 0)

/**
 * Every user with usage this week (old tokens or model usage), with the old token % next to the new cost %.
 * The memberships of all those users are fetched at once, not per user.
 */
export const getUsageComparison = async (): Promise<UsageComparisonRow[]> => {
  const users = await User.findAll({
    where: { [Op.or]: [{ usage: { [Op.gt]: 0 } }, literal(`weekly_model_usage <> '{}'::jsonb`)] },
    attributes: ['id', 'username', 'firstNames', 'lastName', 'isPowerUser', 'usage', 'weeklyModelUsage'],
  })

  const coursesByUser = await getActiveCourseMembershipsByUser(users.map((user) => user.id))

  const rows = users.map((user): UsageComparisonRow => {
    const courses = coursesByUser.get(user.id) ?? []
    const tokenUsage = user.usage ?? 0
    const tokenLimit = tokenLimitOfCourses(user, courses)
    const cost = usageCost(user.weeklyModelUsage ?? {})
    const budget = budgetOfCourses(courses)

    return {
      userId: user.id,
      username: user.username,
      firstNames: user.firstNames ?? null,
      lastName: user.lastName ?? null,
      tokenUsage,
      tokenLimit,
      tokenPercent: percent(tokenUsage, tokenLimit),
      cost,
      budget,
      costPercent: percent(cost, budget.limit),
    }
  })

  return rows.sort((a, b) => b.costPercent - a.costPercent)
}
