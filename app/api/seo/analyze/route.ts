import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// اسکیمای تحلیل محتوا
const analyzeSchema = z.object({
  content: z.string().min(100),
  title: z.string().min(10).max(100),
  metaDescription: z.string().max(160).optional(),
  keywords: z.string().optional()
})

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'برای استفاده از تحلیلگر سئو باید وارد شوید' },
        { status: 401 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = analyzeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { content, title, metaDescription, keywords } = validation.data

    // تحلیل محتوا - نمونه پیاده‌سازی
    const analysisResult = await analyzeContent({
      content,
      title,
      metaDescription,
      keywords
    })

    logger.info('تحلیل سئو انجام شد', {
      userId: currentUser.id,
      analysisId: analysisResult.analysisId
    })

    return NextResponse.json(analysisResult)

  } catch (error) {
    logger.error('خطا در تحلیل سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در تحلیل سئو' },
      { status: 500 }
    )
  }
}

// تابع تحلیل محتوا (پیاده‌سازی نمونه)
async function analyzeContent(data: {
  content: string,
  title: string,
  metaDescription?: string,
  keywords?: string
}) {
  // تحلیل عنوان
  const titleAnalysis = {
    length: data.title.length,
    ideal: data.title.length >= 40 && data.title.length <= 60,
    containsKeyword: data.keywords 
      ? data.title.toLowerCase().includes(data.keywords.toLowerCase())
      : false,
    score: Math.min(100, Math.floor(data.title.length * 1.5))
  }

  // تحلیل توضیحات متا
  const description = data.metaDescription || data.content.substring(0, 160)
  const descriptionAnalysis = {
    length: description.length,
    ideal: description.length >= 120 && description.length <= 160,
    containsKeyword: data.keywords 
      ? description.toLowerCase().includes(data.keywords.toLowerCase())
      : false,
    score: Math.min(100, Math.floor(description.length * 0.625))
  }

  // تحلیل محتوای اصلی
  const wordCount = data.content.split(/\s+/).length
  const paragraphCount = data.content.split('\n\n').length
  const headingMatches = data.content.match(/^#+\s+.+/gm) || []
  const hasH1 = headingMatches.some(h => h.startsWith('# '))
  const imageCount = (data.content.match(/!\[.*?\]\(.*?\)/g) || []).length

  // تحلیل کلمات کلیدی
  let keywordAnalysis = null
  if (data.keywords) {
    const keyword = data.keywords.toLowerCase()
    const contentLower = data.content.toLowerCase()
    const keywordCount = contentLower.split(keyword).length - 1
    const keywordDensity = (keywordCount / wordCount) * 100
    
    keywordAnalysis = {
      count: keywordCount,
      density: keywordDensity.toFixed(2),
      ideal: keywordDensity >= 0.5 && keywordDensity <= 2.5,
      positions: getKeywordPositions(data.content, keyword),
      score: Math.min(100, Math.floor(keywordDensity * 40))
    }
  }

  // محاسبه امتیاز کلی
  const totalScore = Math.round((
    titleAnalysis.score * 0.3 +
    descriptionAnalysis.score * 0.2 +
    (keywordAnalysis?.score || 0) * 0.2 +
    Math.min(100, wordCount * 0.1) * 0.2 +
    (hasH1 ? 20 : 0) +
    (imageCount > 0 ? 10 : 0)
  ))

  // ساختار نتیجه نهایی
  return {
    analysisId: `seo-${Date.now()}`,
    overallScore: totalScore,
    titleAnalysis,
    descriptionAnalysis,
    keywordAnalysis,
    contentAnalysis: {
      wordCount,
      paragraphCount,
      headingCount: headingMatches.length,
      hasH1,
      imageCount,
      readabilityScore: calculateReadability(data.content)
    },
    suggestions: generateSuggestions({
      titleAnalysis,
      descriptionAnalysis,
      keywordAnalysis,
      contentAnalysis: {
        wordCount,
        hasH1,
        imageCount
      }
    })
  }
}

// --- توابع کمکی ---

function getKeywordPositions(content: string, keyword: string) {
  const positions = []
  let pos = content.toLowerCase().indexOf(keyword)
  
  while (pos !== -1) {
    positions.push({
      position: pos,
      context: content.substring(Math.max(0, pos - 20), pos + keyword.length + 20)
    })
    pos = content.toLowerCase().indexOf(keyword, pos + 1)
  }
  
  return positions.slice(0, 5) // فقط 5 موقعیت اول
}

function calculateReadability(text: string) {
  // محاسبه ساده خوانایی
  const words = text.split(/\s+/)
  const sentences = text.split(/[.!?]+/)
  const wordCount = words.length
  const sentenceCount = sentences.length
  const avgWordsPerSentence = wordCount / sentenceCount
  
  return Math.min(100, Math.max(0, 100 - (avgWordsPerSentence - 10) * 2))
}

function generateSuggestions(analysis: any) {
  const suggestions = []
  
  // پیشنهادات مربوط به عنوان
  if (!analysis.titleAnalysis.ideal) {
    suggestions.push(
      analysis.titleAnalysis.length < 40
        ? 'عنوان شما کوتاه است. سعی کنید آن را به 40-60 کاراکتر برسانید.'
        : 'عنوان شما طولانی است. سعی کنید آن را زیر 60 کاراکتر نگه دارید.'
    )
  }
  
  if (analysis.keywordAnalysis && !analysis.titleAnalysis.containsKeyword) {
    suggestions.push('کلمه کلیدی اصلی را در عنوان قرار دهید.')
  }

  // پیشنهادات مربوط به توضیحات
  if (!analysis.descriptionAnalysis.ideal) {
    suggestions.push(
      analysis.descriptionAnalysis.length < 120
        ? 'توضیحات متا کوتاه است. سعی کنید آن را به 120-160 کاراکتر برسانید.'
        : 'توضیحات متا طولانی است. سعی کنید آن را زیر 160 کاراکتر نگه دارید.'
    )
  }

  // پیشنهادات مربوط به محتوا
  if (analysis.contentAnalysis.wordCount < 300) {
    suggestions.push('محتوای شما کوتاه است. سعی کنید حداقل 300 کلمه بنویسید.')
  }
  
  if (!analysis.contentAnalysis.hasH1) {
    suggestions.push('از تگ H1 در محتوای خود استفاده کنید.')
  }
  
  if (analysis.contentAnalysis.imageCount === 0) {
    suggestions.push('حداقل یک تصویر به محتوای خود اضافه کنید.')
  }

  // پیشنهادات مربوط به کلمات کلیدی
  if (analysis.keywordAnalysis) {
    if (!analysis.keywordAnalysis.ideal) {
      suggestions.push(
        analysis.keywordAnalysis.density < 0.5
          ? 'چگالی کلمه کلیدی شما کم است. سعی کنید آن را به 0.5-2.5% برسانید.'
          : 'چگالی کلمه کلیدی شما زیاد است. از تکرار بیش از حد خودداری کنید.'
      )
    }
    
    if (analysis.keywordAnalysis.positions.length === 0) {
      suggestions.push('کلمه کلیدی را در محتوای خود استفاده کنید.')
    }
  }

  return suggestions.length > 0 ? suggestions : ['محتوای شما از نظر سئو خوب است!']
}
