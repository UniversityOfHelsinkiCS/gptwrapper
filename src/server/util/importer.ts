import { IMPORTER_URL, API_TOKEN } from './config'
import { Enrollment, CourseUnitRealisation } from '../types'
import { set, get } from './redis'

const getActiveEnrollments = (enrollments: Enrollment[]) => {
  const filteredEnrollments = enrollments.filter((enrollment) => {
    // if (enrollment.state !== 'ENROLLED') return false
    if (!enrollment.courseUnitRealisation.id) return false
    return true
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

export const getCourse = async (
  courseId: string
): Promise<CourseUnitRealisation | null> => {
  const url = `${IMPORTER_URL}/kliksutin/course/${courseId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const course: CourseUnitRealisation | null = await response.json()

  return course
}
