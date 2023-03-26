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
    max_tokens: 100,
    n: 1,
    stop: null,
    temperature: 0.5,
  }

  const { data } = await axios.post('gptwrapper/api/v0/chat', {
    id: 'exampleService',
    options,
  })

  return data
}

export default getCompletion
