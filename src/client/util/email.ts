import { PUBLIC_URL } from '../../config'

export const sendEmail = async (text: string, subject: string) => {
  const response = await fetch(`${PUBLIC_URL}/api/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      subject,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status}`)
  }

  return response
}
