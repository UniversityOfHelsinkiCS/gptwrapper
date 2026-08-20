import queryClient from './queryClient'

export const invalidatePromptLists = (destinationCourseId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['/prompts/my-prompts'] })
  queryClient.invalidateQueries({ queryKey: ['chatInstances', 'user'] })
  if (destinationCourseId) queryClient.invalidateQueries({ queryKey: ['course', destinationCourseId] })
}

export const invalidateAllPromptLists = () => {
  queryClient.invalidateQueries({ queryKey: ['/prompts/my-prompts'] })
  queryClient.invalidateQueries({ queryKey: ['chatInstances', 'user'] })
  queryClient.invalidateQueries({ queryKey: ['course'] })
}
