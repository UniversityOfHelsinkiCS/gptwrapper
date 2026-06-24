type RagNavigationOptions = {
  indexId?: number
  fileId?: number
  returnToEditor?: boolean
  returnPromptId?: string | null
  promptTab?: string | null
  ragTab?: string | null
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
  ragTab: searchParams.get('ragTab'),
})

export const createRagSearchParams = ({ indexId, fileId, returnToEditor, returnPromptId, promptTab, ragTab }: RagNavigationOptions = {}) => {
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
  } else if (ragTab) {
    params.set('ragTab', ragTab)
  }

  return params.toString()
}

export const createRagPath = (courseId: string, options: RagNavigationOptions = {}) => {
  const search = createRagSearchParams(options)
  const path = options.ragTab === 'user' ? `/${courseId}/userrags` : `/${courseId}/course/rag`
  return `${path}${search ? `?${search}` : ''}`
}
