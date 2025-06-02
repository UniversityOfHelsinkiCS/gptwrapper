import { Router } from 'express'
import { courseAssistants } from '../util/azure/courseAssistants'

const router = Router()

router.get('/for-course/:courseId', async (req, res) => {
  const { courseId } = req.params

  const courseAssistant = courseAssistants.find((assistant) => assistant.course_id === courseId)

  if (!courseAssistant) {
    res.status(404).send('Course assistant not found')
    return
  }

  res.send(courseAssistant)
})

export default router
