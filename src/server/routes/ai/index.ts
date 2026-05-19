import express from 'express'
import fileSearchResultsRouter from './fileSearchResults'
import agentRouter from './v4'
import v3Router from './v3'

const aiRouter = express.Router()

aiRouter.use('/v3', v3Router)

aiRouter.use('/v4', agentRouter)

aiRouter.use('/toolResults', fileSearchResultsRouter)

export default aiRouter
