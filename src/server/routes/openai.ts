import express from 'express'
import multer from 'multer'

// import { tikeIam } from '../util/config'
import { CourseChatRequest, AzureOptions, RequestWithUser } from '../types'
import { isError } from '../util/parser'
import {
  calculateUsage,
  incrementUsage,
  checkUsage,
  checkCourseUsage,
  incrementCourseUsage,
} from '../chatInstances/usage'
// import { completionStream, handleTike } from '../util/openai'
import { getCompletionEvents, streamCompletion } from '../util/azure'
import {
  getMessageContext,
  getModelContextLimit,
  getCourseModel,
  getAllowedModels,
} from '../util/util'
import getEncoding from '../util/tiktoken'
import logger from '../util/logger'

const openaiRouter = express.Router()

const storage = multer.memoryStorage()
const upload = multer({ storage })

const fileParsing = async (options: any, req: any) => {
  const fileBuffer = req.file.buffer
  let fileContent = ''
  if (req.file.mimetype === 'text/plain') {
    fileContent = fileBuffer.toString('utf8')
  }

  const allMessages = options.messages

  const updatedMessage = {
    ...allMessages[allMessages.length - 1],
    content: `${allMessages[allMessages.length - 1].content} ${fileContent}`,
  }
  options.messages.pop()
  // eslint-disable-next-line no-param-reassign
  options.messages = [...options.messages, updatedMessage]

  return options.messages
}

openaiRouter.post('/stream/inventorstep1', async (req, res) => {
  console.log('Inventor Step 1')

  const request = req as RequestWithUser
  const { options } = req.body
  const { model, ideaTopic, ideaIndustry, ideaOrigin } = options
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkUsage(user, model)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.stream = true

  const encoding = getEncoding(model)

  const fullPrompt = `
  You are an expert inventor employing chain of thought analysis to meticulously craft an invention report. Patent applications are scrutinized based on three pivotal criteria:
  1. Inventive Step: This criterion demands that your product or process not only solves a problem but does so through an inventive approach that is not obvious to someone with expertise in the field.
  2. Novelty: Your invention must be unique, signifying that no part of it has been previously disclosed to the public in any form, including by the inventor themselves. This requires a thorough examination of existing solutions, patents, and publicly available information to ensure that your invention stands apart. Special attention should be paid to any prior disclosures made by the inventor, assessing how such disclosures impact the invention's novelty. 
  Critically remark on already published and disclosed materials.
  3. Industrial Applicability: The invention should have practical utility in its respective industry, capable of being manufactured or used in any kind of industry.
  
  To construct a comprehensive invention report, proceed through the following enhanced steps:
  
  Step 1: Contextual Understanding
    Begin by analyzing the given context, focusing on the specific problem the invention aims to solve within its industry.
  
  Step 2: Critical Evaluation of Novelty including public dissemination by the inventor
    Conduct a detailed evaluation of the novelty aspect by identifying any existing solutions, patents, or public disclosures that resemble the invention. This includes a critical examination of any disclosures made by the inventor that could potentially jeopardize the invention's novelty.
    Consider the following:
    a. What distinguishes the invention from existing solutions, including any previous versions or disclosures by the inventor?
    b. How does it improve upon or deviate from these solutions in a way that was not previously public knowledge, taking into account any inventor's own prior disclosures?
    c. Provide examples of prior art (if any) and critically evaluate how the invention differs significantly, especially in light of any self-disclosure by the inventor.
  
  Step 3: Inventive Step and Industrial Applicability Analysis
    Examine the inventive step by explaining the unique approach or solution the invention proposes. Detail how this approach is non-obvious to experts in the field.
    Assess the industrial applicability by demonstrating how the invention can be utilized or manufactured, including its practical benefits to the industry.
  
  Step 4: Crystallization of the Invention
    Finally, synthesize your findings into a coherent invention report. This should include a clear statement of the invention following the idea topic, its background, relevance to the industry, and its unique contributions to the field.
   
  The idea is: ${ideaTopic} *** Novelty for critical analysis: ${ideaOrigin} *** Industry relevance: ${ideaIndustry}
  `

  options.messages = [{ role: 'user', content: fullPrompt }]

  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  if (model === 'gpt-4') await incrementUsage(user, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

openaiRouter.get('/stream/inventor/ping1', async (req, res) => {
  console.log('INNOTIN IS PINGING FROM FRONTEND')

  res.send()
})

openaiRouter.get('/stream/inventor/ping2', async (req, res) => {
  console.log('INNOTIN IS PINGING FROM BACKEND')

  res.send()
})

openaiRouter.post('/stream/inventorstep2', async (req, res) => {
  console.log('Inventor Step 2')

  const request = req as RequestWithUser
  const { options } = req.body
  const { model, ideaTopic, ideaIndustry, ideaOrigin } = options
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkUsage(user, model)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.stream = true

  const encoding = getEncoding(model)

  const fullPrompt = `
      You are an expert inventor employing chain of thought analysis to meticulously craft an invention report. Patent applications are scrutinized based on three pivotal criteria:
      1. Inventive Step: This criterion demands that your product or process not only solves a problem but does so through an inventive approach that is not obvious to someone with expertise in the field.
      2. Novelty: Your invention must be unique, signifying that no part of it has been previously disclosed to the public in any form, including by the inventor themselves. This requires a thorough examination of existing solutions, patents, and publicly available information to ensure that your invention stands apart. Special attention should be paid to any prior disclosures made by the inventor, assessing how such disclosures impact the invention's novelty. 
      Critically remark on already published and disclosed materials.
      3. Industrial Applicability: The invention should have practical utility in its respective industry, capable of being manufactured or used in any kind of industry.
      
      To construct a comprehensive invention report, proceed through the following enhanced steps:
      
      Step 1: Contextual Understanding
        Begin by analyzing the given context, focusing on the specific problem the invention aims to solve within its industry.
      
      Step 2: Critical Evaluation of Novelty including public dissemination by the inventor
        Conduct a detailed evaluation of the novelty aspect by identifying any existing solutions, patents, or public disclosures that resemble the invention. This includes a critical examination of any disclosures made by the inventor that could potentially jeopardize the invention's novelty.
        Consider the following:
        a. What distinguishes the invention from existing solutions, including any previous versions or disclosures by the inventor?
        b. How does it improve upon or deviate from these solutions in a way that was not previously public knowledge, taking into account any inventor's own prior disclosures?
        c. Provide examples of prior art (if any) and critically evaluate how the invention differs significantly, especially in light of any self-disclosure by the inventor.
      
      Step 3: Inventive Step and Industrial Applicability Analysis
        Examine the inventive step by explaining the unique approach or solution the invention proposes. Detail how this approach is non-obvious to experts in the field.
        Assess the industrial applicability by demonstrating how the invention can be utilized or manufactured, including its practical benefits to the industry.
      
      Step 4: Crystallization of the Invention
        Finally, synthesize your findings into a coherent invention report. This should include a clear statement of the invention following the idea topic, its background, relevance to the industry, and its unique contributions to the field.
      
      The idea is: ${ideaTopic} *** Novelty for critical analysis: ${ideaOrigin} *** Industry relevance: ${ideaIndustry}
      `

  options.messages = [{ role: 'user', content: fullPrompt }]

  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)

  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  if (model === 'gpt-4') await incrementUsage(user, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

openaiRouter.post('/stream/innotin', async (req, res) => {
  console.log('INNOTIN PINGING')

  const request = req as RequestWithUser
  const { options } = req.body
  const { model } = options
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkUsage(user, model)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.messages = getMessageContext(options.messages)
  options.stream = true
  console.log('options messages:', options.messages)
  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  console.log('OPTIONS: ', options)
  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  if (model === 'gpt-4') await incrementUsage(user, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

openaiRouter.post('/stream', upload.single('file'), async (req, res) => {
  const request = req as RequestWithUser
  const { options } = JSON.parse(req.body.options)
  const { model } = options
  const { user } = request

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkUsage(user, model)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  let optionsMessagesWithFile = null

  try {
    if (req.file) {
      optionsMessagesWithFile = await fileParsing(options, req)
    }
  } catch (error) {
    logger.error('Error parsing file', { error })
    return res.status(400).send('Error parsing file')
  }
  console.log('optionsMessage: ', optionsMessagesWithFile)
  options.messages = getMessageContext(
    optionsMessagesWithFile || options.messages
  )
  options.stream = true

  const encoding = getEncoding(model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  // Tike API quota reached so this is disabled for now.
  // Ask JP for how it's going to be done in the future.
  /* const isTike = user.iamGroups.some((iam) => iam.includes(tikeIam))

  if (isTike) {
    const stream = await completionStream(options)

    if (isError(stream)) return res.status(424)

    res.setHeader('content-type', 'text/event-stream')

    tokenCount += await handleTike(stream, encoding, res)
  } else { */
  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )
  // }

  if (model === 'gpt-4') await incrementUsage(user, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

openaiRouter.post('/stream/:courseId', async (r, res) => {
  const { courseId } = r.params
  const req = r as CourseChatRequest
  const { options } = req.body
  const { user } = req

  if (!user.id) return res.status(401).send('Unauthorized')

  const usageAllowed = await checkCourseUsage(user, courseId)
  if (!usageAllowed) return res.status(403).send('Usage limit reached')

  options.messages = getMessageContext(options.messages)
  options.stream = true

  const model = await getCourseModel(courseId)

  if (options.model) {
    const allowedModels = getAllowedModels(model)
    if (!allowedModels.includes(options.model))
      return res.status(403).send('Model not allowed')
  } else {
    options.model = model
  }

  const encoding = getEncoding(options.model)
  let tokenCount = calculateUsage(options, encoding)

  const contextLimit = getModelContextLimit(options.model)
  if (tokenCount > contextLimit) {
    logger.info('Maximum context reached')
    return res.status(403).send('Model maximum context reached')
  }

  // Downgrade to gpt-3.5 for long student conversations
  if (courseId && model === 'gpt-4' && tokenCount > 2_000) {
    options.model = 'gpt-3.5-turbo'
    tokenCount = Math.round(tokenCount / 10)
  }

  const events = await getCompletionEvents(options as AzureOptions)

  if (isError(events)) return res.status(424).send(events)

  res.setHeader('content-type', 'text/event-stream')

  tokenCount += await streamCompletion(
    events,
    options as AzureOptions,
    encoding,
    res
  )

  await incrementCourseUsage(user, courseId, tokenCount)
  logger.info(`Stream ended. Total tokens: ${tokenCount}`, {
    tokenCount,
    courseId,
    model: options.model,
    user: user.username,
  })

  encoding.free()

  return res.end()
})

export default openaiRouter
