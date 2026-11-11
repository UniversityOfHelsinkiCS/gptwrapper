import express from 'express'
import { inProduction } from '../../../config'
import { PostStreamSchemaV4, type ChatEvent } from '../../../shared/agentChat'
import { runAgent } from '../../services/agent/runAgent'
import type { RequestWithUser } from '../../types'
import logger from '../../util/logger'
import { upload } from './multer'

const router = express.Router()

/**
 * Streams one chat turn as NDJSON `ChatEvent`s. The run itself lives in `runAgent`;
 * this route only adapts it to HTTP: request parsing, headers, backpressure and abort on disconnect.
 * Responds 201 with `{ warnings }` instead of a stream when the client must confirm warnings first.
 */
router.post('/stream', upload.single('file'), async (r, res) => {
  const requestStartTime = Date.now()
  const req = r as RequestWithUser
  const request = PostStreamSchemaV4.parse(JSON.parse(req.body.data))
  const { user } = req

  res.locals.chatCompletionMeta = { streamVersion: 'v4', fileSize: req.file?.size }

  const abortController = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) {
      logger.info('Client disconnected, aborting agent run', { model: request.options.generationInfo.model })
      abortController.abort('client_disconnected')
    }
  })

  const onStart = () => {
    res.locals.chatCompletionMeta.timeToStreamStart = Date.now() - requestStartTime
    res.setHeader('content-type', 'text/event-stream')
    res.setHeader('cache-control', 'no-cache')
    res.setHeader('connection', 'keep-alive')
    res.flushHeaders()
  }

  const emit = async (event: ChatEvent) => {
    if (res.destroyed || res.writableEnded) return
    await new Promise<void>((resolve) => {
      const success = res.write(`${JSON.stringify(event)}\n`, (err) => {
        if (err) {
          logger.error('Streaming write error:', { error: err.name })
          resolve()
        }
      })

      if (success) {
        process.nextTick(resolve)
        return
      }

      const done = () => {
        res.off('drain', done)
        res.off('close', done)
        res.off('error', done)
        resolve()
      }
      res.once('drain', done)
      res.once('close', done)
      res.once('error', done)
    })
  }

  const result = await runAgent({
    user,
    // If an admin hijacks a user in production, the admin pays.
    chargeUser: inProduction && req.hijackedBy ? req.hijackedBy : user,
    request,
    meta: res.locals.chatCompletionMeta,
    signal: abortController.signal,
    onStart,
    emit,
  })

  if (result.status === 'warnings') {
    res.setHeader('content-type', 'application/json')
    res.status(201).json({ warnings: result.warnings })
    return
  }

  if (!res.writableEnded) {
    res.end()
  }
})

export default router
