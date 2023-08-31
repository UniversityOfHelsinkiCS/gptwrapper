import { IMPORTER_URL, API_TOKEN } from './config'
import { Enrollment } from '../types'
import { set, get } from './redis'

const getActiveEnrollments = (enrollments: Enrollment[]) => {
  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (enrollment.state !== 'ENROLLED') return false
    if (!enrollment.courseUnitRealisation.id) return false

    const { startDate, endDate } =
      enrollment.courseUnitRealisation.activityPeriod

    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    return now >= start && now <= end
  })

  return filteredEnrollments
}

export const getEnrollments = async (userId: string): Promise<Enrollment[]> => {
  const redisKey = `${userId}-enrollments`

  const cachedEnrollments = await get(redisKey)
  if (cachedEnrollments) return cachedEnrollments

  const url = `${IMPORTER_URL}/kliksutin/enrollments/${userId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const data = await response.json()

  const enrollments = getActiveEnrollments(data || [])

  await set(redisKey, enrollments)

  return enrollments
}

export const getTeachers = async (courseId: string): Promise<string[]> => {
  const redisKey = `${courseId}-teachers`

  const cachedTeachers = await get(redisKey)
  if (cachedTeachers) return cachedTeachers

  const url = `${IMPORTER_URL}/kliksutin/teachers/${courseId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const teachers: string[] = (await response.json()) || []

  await set(redisKey, teachers)

  return teachers
}
