import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/app/api/upload/route'
import fs from 'fs/promises'
import { createMocks } from 'node-mocks-http'

jest.mock('fs/promises')
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }))

describe('File Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upload file successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' }
    })

    // Mock file data
    req.file = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test')
    }

    await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse)

    expect(res._getStatusCode()).toBe(200)
    expect(res._getJSONData()).toHaveProperty('url', '/uploads/mock-uuid.jpg')
  })
})
