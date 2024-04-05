import axios from 'axios'

import { IMPORTER_URL, API_TOKEN } from '../util/config'
import logger from '../util/logger'

const importerClient = axios.create({
  baseURL: IMPORTER_URL,
  params: {
    token: API_TOKEN,
  },
})

const defaultValidator = () => true

export const fetchData = async <T = unknown>(
  url: string,
  params: Record<string, any> = {},
  validator: (data: T) => boolean = defaultValidator
): Promise<T> => {
  const { data } = await importerClient.get(`curre/${url}`, {
    params,
  })

  if (data.waitAndRetry) {
    // importer is working to prepare data. Wait a bit and try again
    const waitTime = data.waitTime ?? 1000
    logger.info(
      `[UPDATER] Importer told me to wait ${waitTime}ms before retrying`
    )
    await new Promise((resolve) => {
      setTimeout(resolve, waitTime)
    })
    return fetchData(url, params)
  }

  if (!validator(data)) {
    throw new Error(
      `[UPDATER] Invalid data received from importer: ${JSON.stringify(data)}`
    )
  }

  return data
}
