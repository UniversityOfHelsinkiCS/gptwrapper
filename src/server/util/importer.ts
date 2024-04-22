import { IMPORTER_URL, API_TOKEN } from './config'
import { CourseUnitRealisation } from '../types'
import logger from './logger'

const importerClient = {
  async get(path: string) {
    const res = await fetch(`${IMPORTER_URL}/${path}?token=${API_TOKEN}`)
      .then((r) => r.json())
      .catch((err) => {
        logger.error('Failed to fetch from importer', err)
        return { error: 'Failed to fetch from importer' }
      })

    return res
  },
}

export const getCourse = async (
  courseId: string
): Promise<CourseUnitRealisation | null> => {
  const data = await importerClient.get(`kliksutin/course/${courseId}`)
  const course: CourseUnitRealisation | null = data.error ? null : data

  return course
}
