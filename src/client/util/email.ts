import { PUBLIC_URL } from '../../config'

export const sendEmail = async (to: string, text: string, subject: string) => {
  const response = await fetch(`${PUBLIC_URL}/api/email`, {
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
