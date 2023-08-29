/* eslint-disable prefer-destructuring, no-restricted-syntax, no-await-in-loop */
import express from 'express'
import { Op } from 'sequelize'

import { Service } from '../db/models'
import { getTeachers } from '../util/importer'

const courseRouter = express.Router()

const getCourses = async () => {
  const courses = await Service.findAll({
    where: {
      courseId: { [Op.not]: null },
    },
  })

  return courses
}

courseRouter.get('/', async (_, res) => {
  const courses = await getCourses()

  return res.send(courses)
})

courseRouter.get('/:id', async (req, res) => {
  const { id } = req.params

  const service = await Service.findOne({
    where: { courseId: id },
    include: 'prompts',
  })

  return res.send(service)
})

courseRouter.get('/user/:userId', async (req, res) => {
  const { userId } = req.params

  const isAdmin = (req as any).user.isAdmin

  if (isAdmin) {
    const allCourses = await getCourses()
    return res.send(allCourses)
  }

  const courses = await getCourses()
  const courseIds = courses.map(({ courseId }) => courseId) as string[]

  if (isAdmin) return res.send(courses)

  const access: Service[] = []
  for (const id of courseIds) {
    const teachers = await getTeachers(id)

    if (teachers.includes(userId)) {
      const course = courses.find(({ courseId }) => courseId === id) as Service

      access.push(course)
    }
  }

  return res.send(access)
})

export default courseRouter
