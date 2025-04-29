import { createPost, getPosts } from '@/services/posts'
import { prismaMock } from '@/tests/setup'

describe('Posts Service', () => {
  describe('createPost', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        categoryId: '1'
      }

      prismaMock.post.create.mockResolvedValue({
        id: '1',
        ...postData,
        published: false,
        authorId: '1',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const result = await createPost(postData, '1')

      expect(result).toHaveProperty('id')
      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: {
          ...postData,
          authorId: '1'
        }
      })
    })
  })

  describe('getPosts', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          published: true,
          categoryId: '1',
          authorId: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      prismaMock.post.count.mockResolvedValue(1)
      prismaMock.post.findMany.mockResolvedValue(mockPosts)

      const result = await getPosts({ page: 1, pageSize: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
    })
  })
})
