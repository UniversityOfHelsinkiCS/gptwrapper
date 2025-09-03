import { PATE_URL, API_TOKEN } from './config'
import { inDevelopment, inCI } from '../../config'
import logger from './logger'

const settings = {
  hideToska: false,
  disableToska: true,
  color: '#107eab',
  header: 'CurreChat',
  headerFontColor: 'white',
  dryrun: inDevelopment,
}

const sendEmail = async (targets: string[], text: string, subject: string) => {
  const emails = targets.map((to) => ({ to, subject }))

  const mail = {
    template: {
      from: 'CurreChat',
      text,
    },
    emails,
    settings,
  }

  const payload = JSON.stringify(mail)

  const payloadSizeKb = Buffer.byteLength(payload, 'utf8') / 1024

  logger.info(`Sending email with payload size ${payloadSizeKb.toFixed(2)} KB`)

  if (inCI || inDevelopment) {
    logger.info('Skipping email sending in CI or development')
    return
  }

  await fetch(`${PATE_URL}?token=${API_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mail),
  })
}

export default sendEmail
