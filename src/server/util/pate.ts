import { PATE_URL, API_TOKEN } from './config'
import { inDevelopment } from '../../config'

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

  await fetch(`${PATE_URL}?token=${API_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mail),
  })
}

export default sendEmail
