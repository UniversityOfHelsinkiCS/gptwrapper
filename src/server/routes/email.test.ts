// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { startTestServer } from '../tests/testServer'

vi.mock('../util/pate', () => ({
  default: vi.fn(),
}))

vi.mock('../util/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}))

import emailRouter from './email'
import sendEmail from '../util/pate'

let currentUser: { id: string; email?: string }

const api = startTestServer('/email', emailRouter, () => currentUser)

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { id: 'u1', email: 'student@helsinki.fi' }
})

const post = (body: unknown) =>
  api.fetch(`/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /email — recipient cannot be chosen by the client', () => {
  test('ignores a `to` field in the body and mails the authenticated user instead', async () => {
    const response = await post({ to: 'another.person@helsinki.fi', text: 'Reset your password here', subject: 'Urgent' })

    expect(response.status).toBe(204)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toEqual(['student@helsinki.fi'])
    expect(JSON.stringify(vi.mocked(sendEmail).mock.calls[0])).not.toContain('another.person@helsinki.fi')
  })
})

describe('POST /email — validation', () => {
  test('rejects a user with no email address without sending anything', async () => {
    currentUser = { id: 'u3' }

    const response = await post({ text: 'Conversation', subject: 'Chat' })

    expect(response.status).toBe(400)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test.each([
    ['both fields missing', {}],
    ['blank text', { text: '   ', subject: 'Chat' }],
    ['empty subject', { text: 'Conversation', subject: '' }],
    ['non-string text', { text: { $ne: null }, subject: 'Chat' }],
  ])('rejects %s without sending anything', async (_name, body) => {
    const response = await post(body)

    expect(response.status).toBe(400)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('sends the mail and answers 204 for a valid request', async () => {
    const response = await post({ text: 'Conversation', subject: 'Chat 27-8-2026' })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(sendEmail).toHaveBeenCalledWith(['student@helsinki.fi'], 'Conversation', 'Chat 27-8-2026')
  })
})
