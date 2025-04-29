// tests/services/seo.test.ts
import { analyzeContent } from '@/services/seo'
import { prismaMock } from '@/tests/setup'

describe('SEO Service', () => {
  describe('analyzeContent', () => {
    it('should return proper analysis for short content', async () => {
      const result = await analyzeContent({
        content: 'این یک محتوای تستی است',
        title: 'تست'
      })

      expect(result).toHaveProperty('overallScore')
      expect(result.overallScore).toBeLessThan(50)
      expect(result.suggestions).toContain(
        'محتوای شما کوتاه است'
      )
    })
  })
})
