import { ApiError } from '../../util/apiClient'
import { NotFound } from './NotFound'

export const ApiErrorView = ({ error }: { error: ApiError }) => {
  if (error.status === 404) {
    return <NotFound />
  }

  throw error
}
