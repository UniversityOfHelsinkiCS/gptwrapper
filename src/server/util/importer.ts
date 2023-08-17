import { IMPORTER_URL, API_TOKEN } from './config'
import { Enrollment } from '../types'

const getEnrollments = async (userId: string): Promise<Enrollment[]> => {
  const url = `${IMPORTER_URL}/kliksutin/enrollments/${userId}`

  const response = await fetch(`${url}?token=${API_TOKEN}`)
  const data = await response.json()

  return data || []
}

export default getEnrollments
