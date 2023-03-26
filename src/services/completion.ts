import axios from 'axios'

const getMessages = (guide: string, question: string) => [
  {
    role: 'system',
    content: guide,
  },
  {
    role: 'user',
    content: question,
  },
]

const getCompletion = async (guide: string, question: string) => {
  const messages = getMessages(guide, question)

  const options = {
    model: 'gpt-3.5-turbo',
    messages,
  }

  const { data } = await axios.post('gptwrapper/api/v0/chat', {
    id: 'educationalResearchTopicalIssues',
    options,
  })

  return data
}

export default getCompletion
