import { vi } from 'vitest'

import { Enrolment, Responsibility } from '../db/models'

/**
 * Sets whether the current user is responsible for, or enrolled on, the chat instance under test.
 * The test file must mock `Responsibility.findOne` and `Enrolment.findOne` in `db/models`.
 */
export const setMembership = ({ responsible = false, enrolled = false }) => {
  vi.mocked(Responsibility.findOne).mockResolvedValue((responsible ? { id: 'responsibility-1' } : null) as any)
  vi.mocked(Enrolment.findOne).mockResolvedValue((enrolled ? { id: 'enrolment-1' } : null) as any)
}
