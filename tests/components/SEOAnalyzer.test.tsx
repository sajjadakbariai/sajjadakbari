// tests/components/SEOAnalyzer.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import SEOAnalysis from '@/components/common/SEOAnalyzer/SEOAnalysis'

describe('SEOAnalysis Component', () => {
  it('displays correct score', () => {
    const mockData = {
      overallScore: 75,
      suggestions: ['Test suggestion'],
      titleAnalysis: {
        length: 50,
        score: 80,
        containsKeyword: true
      }
    }

    render(<SEOAnalysis data={mockData} />)
    
    expect(screen.getByText('امتیاز کلی سئو')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Test suggestion')).toBeInTheDocument()
  })
})
