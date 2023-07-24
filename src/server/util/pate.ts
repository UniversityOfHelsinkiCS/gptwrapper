import { PATE_URL } from './config'
import { inDevelopment } from '../../config'

const settings = {
  hideToska: false,
  disableToska: true,
  color: '#107eab',
  header: 'Gptwrapper',
  headerFontColor: 'white',
  dryrun: inDevelopment,
}

const sendEmail = async (targets: string[], text: string, subject: string) => {
  const emails = targets.map((to) => ({ to, subject }))

  const mail = {
    template: {
      from: 'Gptwrapper',
      text,
    },
    emails,
    settings,
  }

  await fetch(`${PATE_URL}?token=${process.env.API_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mail),
  })
}

export default sendEmail
