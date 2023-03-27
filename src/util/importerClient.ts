import axios from 'axios'

import { IMPORTER_URL, API_TOKEN } from './config'

const importerClient = axios.create({
  baseURL: IMPORTER_URL,
  headers: {
    token: API_TOKEN,
  },
})

export default importerClient
