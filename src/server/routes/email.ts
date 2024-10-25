import express from 'express'

import sendEmail from '../util/pate'

const emailRouter = express.Router()

emailRouter.post('/', async (req, res) => {
  const { to, text, subject } = req.body

  const response = await sendEmail([to], text, subject)

  res.send(response)
})

export default emailRouter
