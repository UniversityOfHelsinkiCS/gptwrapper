import express from 'express'

import logger from './util/logger.js'

const app = express()

app.get('/', (_, res) => {
  res.send('Hello World')
})

app.listen(3000, () => {
  logger.info('Server is running')
})
