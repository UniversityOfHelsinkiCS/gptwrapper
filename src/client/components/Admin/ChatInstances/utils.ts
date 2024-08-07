import { ChatInstance, ChatInstanceUsage } from '../../../types'

export const calculateCourseUsage = (
  usage: ChatInstanceUsage[],
  courses: ChatInstance[]
) => {
  const courseUsage = courses.map((course) => ({
    course,
    usageCount: 0,
  }))

  const filteredUsage = usage.filter((u) =>
    courses.map((course) => course.id).includes(u.chatInstance.id)
  )

  filteredUsage.forEach(({ usageCount, chatInstance }) => {
    const course = courseUsage.find(
      ({ course: { id } }) => id === chatInstance.id
    )
    if (course) course.usageCount += usageCount
  })

  return courseUsage
}
