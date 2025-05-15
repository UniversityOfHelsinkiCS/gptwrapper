import { JAMI_URL, API_TOKEN } from './config'
import { OrganisationData } from '../types'

export const getOrganisationData = async (): Promise<OrganisationData[]> => {
  const response = await fetch(`${JAMI_URL}/organisation-data?token=${API_TOKEN}`)

  const data = await response.json()

  return data
}
