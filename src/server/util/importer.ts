import { IMPORTER_URL, API_TOKEN } from './config'
import { Enrollment } from '../types'

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
  const url = `${IMPORTER_URL}/kliksutin/enrollments/${userId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const data = await response.json()

  const enrollments = getActiveEnrollments(data || [])

  return enrollments
}

export const getTeachers = async (courseId: string): Promise<string[]> => {
  const url = `${IMPORTER_URL}/kliksutin/teachers/${courseId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const teachers: string[] = (await response.json()) || []

  return teachers
}
