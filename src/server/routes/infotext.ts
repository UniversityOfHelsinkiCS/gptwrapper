import express from 'express'
import InfoText from '../db/models/infotext'

const infoTextRouter = express.Router()

infoTextRouter.get('/', async (req, res) => {
  const infoTexts = await InfoText.findAll()

  res.send(infoTexts)
})

export default infoTextRouter
