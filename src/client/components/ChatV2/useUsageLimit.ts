import { useEffect } from 'react'
import { FREE_MODEL, type ValidModelName } from '../../../config'
import type { UserStatus } from '../../types'

/**
 * What the user's weekly usage allows in the chat. Under token enforcement, a user at the limit is moved to the free
 * model (`tokenLimitExceeded`). Under cost enforcement no model is free: at the budget limit sending is blocked until
 * `budgetResetsAt` (ISO time), and the model is left as it is.
 */
export const useUsageLimit = (userStatus: UserStatus | undefined, setModel: (model: ValidModelName) => void) => {
  const limitReached = !!userStatus && userStatus.usage >= userStatus.limit
  const tokenLimitExceeded = limitReached && userStatus.mode !== 'cost'
  const budgetResetsAt = limitReached && userStatus.mode === 'cost' ? userStatus.resetsAt : null

  useEffect(() => {
    if (tokenLimitExceeded) setModel(FREE_MODEL)
  }, [tokenLimitExceeded])

  return { tokenLimitExceeded, budgetResetsAt }
}
