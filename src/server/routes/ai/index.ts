import express from 'express'
import fileSearchResultsRouter from './fileSearchResults'
import v4Router from './v4'

const aiRouter = express.Router()

aiRouter.use('/v4', v4Router)

aiRouter.use('/toolResults', fileSearchResultsRouter)

export default aiRouter
