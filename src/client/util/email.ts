import { BASE_PATH } from '../../config'

export const sendEmail = async (to: string, text: string, subject: string) => {
  const response = await fetch(`${BASE_PATH}/api/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      text,
      subject,
    }),
  })

  return response
}
