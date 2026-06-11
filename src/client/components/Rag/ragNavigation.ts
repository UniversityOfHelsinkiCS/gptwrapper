type RagNavigationOptions = {
  indexId?: number
  fileId?: number
  returnToEditor?: boolean
  returnPromptId?: string | null
  promptTab?: string | null
}

const getNumberParam = (value: string | null) => {
  const parsedValue = Number(value)
  return parsedValue !== 0 && Number.isFinite(parsedValue) ? parsedValue : undefined
}

export const getRagNavigationState = (searchParams: URLSearchParams) => ({
  indexId: getNumberParam(searchParams.get('index')),
  fileId: getNumberParam(searchParams.get('file')),
  returnToEditor: searchParams.get('editPrompt') === '1',
  returnPromptId: searchParams.get('promptId'),
  promptTab: searchParams.get('promptTab'),
})

export const createRagSearchParams = ({ indexId, fileId, returnToEditor, returnPromptId, promptTab }: RagNavigationOptions = {}) => {
  const params = new URLSearchParams()

  if (indexId) {
    params.set('index', String(indexId))
  }

  if (fileId) {
    params.set('file', String(fileId))
  }

  if (returnToEditor) {
    params.set('editPrompt', '1')
  }

  if (returnPromptId) {
    params.set('promptId', returnPromptId)
  }

  if (promptTab) {
    params.set('promptTab', promptTab)
  }

  return params.toString()
}

export const createRagPath = (courseId: string, options: RagNavigationOptions = {}) => {
  const search = createRagSearchParams(options)
  return `/${courseId}/course/rag${search ? `?${search}` : ''}`
}