import axios from 'axios'

import { PUBLIC_URL } from '../../config'

const apiClient = axios.create({ baseURL: `${PUBLIC_URL}/api` })

export default apiClient
