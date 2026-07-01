// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

vi.mock('../../db/models', () => ({
  Responsibility: { findAll: vi.fn() },
  RagIndex: { findByPk: vi.fn() },
  ChatInstance: {},
  RagFile: {},
}))

import { ragIndexMiddleware } from './ragIndexMiddleware'
import { Responsibility, RagIndex } from '../../db/models'

const makeReq = (user: any, ragIndexId = '1') => ({ params: { ragIndexId }, user }) as unknown as Request
const makeRes = () => {
  const res = {} as Response
  res.status = vi.fn().mockReturnThis()
  res.json = vi.fn().mockReturnThis()
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('ragIndexMiddleware', () => {
  test('returns 403 when user is not admin, responsible or owner', async () => {
    const user = {
      id: 'u1',
      isAdmin: false,
    }
    const ragIndexId = '1'

    vi.mocked(Responsibility.findAll).mockResolvedValue([])
    vi.mocked(RagIndex.findByPk).mockResolvedValue({ id: 1, userId: 'someone-else', chatInstances: [] } as any)

    const request = makeReq(user, ragIndexId)
    const response = makeRes()
    const next = vi.fn() as NextFunction

    await ragIndexMiddleware(request, response, next)

    expect(response.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('passes a responsible teacher to see course rags owned by someone else', async () => {
    const user = {
      id: 'u1',
      isAdmin: false,
    }
    const ragIndexId = '1'

    vi.mocked(Responsibility.findAll).mockResolvedValue([{ chatInstanceId: 'ci-1' } as any])
    vi.mocked(RagIndex.findByPk).mockResolvedValue({ id: 1, userId: 'someone-else', chatInstances: [{ id: 'ci-1' }] } as any)

    const request = makeReq(user, ragIndexId)
    const response = makeRes()
    const next = vi.fn() as NextFunction

    await ragIndexMiddleware(request, response, next)

    expect(response.status).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  test('passes and shows rag owner their rags', async () => {
    const user = {
      id: 'u1',
      isAdmin: false,
    }
    const ragIndexId = '1'

    vi.mocked(Responsibility.findAll).mockResolvedValue([] as any)
    vi.mocked(RagIndex.findByPk).mockResolvedValue({ id: 1, userId: 'u1', chatInstances: [] } as any)

    const request = makeReq(user, ragIndexId)
    const response = makeRes()
    const next = vi.fn() as NextFunction

    await ragIndexMiddleware(request, response, next)

    expect(response.status).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  test('passes an admin to any rag index, even one they neither own nor are responsible for', async () => {
    const user = {
      id: 'u1',
      isAdmin: true,
    }
    const ragIndexId = '1'

    vi.mocked(Responsibility.findAll).mockResolvedValue([])
    vi.mocked(RagIndex.findByPk).mockResolvedValue({ id: 1, userId: 'someone-else', chatInstances: [] } as any)

    const request = makeReq(user, ragIndexId)
    const response = makeRes()
    const next = vi.fn() as NextFunction

    await ragIndexMiddleware(request, response, next)

    expect(next).toHaveBeenCalled()
    expect(response.status).not.toHaveBeenCalled()
  })
})
