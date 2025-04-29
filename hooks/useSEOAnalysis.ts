// hooks/useSEOAnalysis.ts
import { useState } from 'react'
import { analyzeContent } from '@/services/seo'

interface SEOAnalysisResult {
  overallScore: number
  suggestions: string[]
  // ... other fields
}

export const useSEOAnalysis = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async (content: string, title?: string) => {
    try {
      setLoading(true)
      setError(null)
      const analysis = await analyzeContent({ content, title })
      setResult(analysis)
    } catch (err) {
      setError('خطا در تحلیل سئو')
    } finally {
      setLoading(false)
    }
  }

  return { analyze, result, loading, error }
}
