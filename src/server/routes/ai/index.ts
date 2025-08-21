import express from 'express'
import fileSearchResultsRouter from './fileSearchResults'
import v1Router from './v1'
import v3Router from './v3'

const aiRouter = express.Router()

aiRouter.use('/v1', v1Router)
aiRouter.use('/v3', v3Router)

aiRouter.use('/toolResults', fileSearchResultsRouter)

export default aiRouter
