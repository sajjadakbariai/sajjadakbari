import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import natural from 'natural'
import * as cheerio from 'cheerio'

// اسکیمای اعتبارسنجی برای بهینه‌سازی
const optimizeSchema = z.object({
  content: z.string().min(100),
  title: z.string().min(10).max(100),
  keywords: z.string().optional(),
  currentSeoData: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
  }).optional()
})

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'برای استفاده از ابزار بهینه‌سازی باید وارد شوید' },
        { status: 401 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = optimizeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { content, title, keywords, currentSeoData } = validation.data

    // تحلیل محتوا و استخراج کلمات کلیدی
    const keywordAnalysis = analyzeKeywords(content, keywords)
    
    // تولید پیشنهادات بهینه‌سازی
    const suggestions = generateOptimizationSuggestions({
      content,
      title,
      keywordAnalysis,
      currentSeoData
    })

    // تولید متادیتاهای بهینه
    const optimizedMetadata = generateOptimizedMetadata({
      title,
      content,
      keywordAnalysis,
      currentSeoData
    })

    logger.info('بهینه‌سازی سئو انجام شد', {
      userId: currentUser.id,
      keywords: keywordAnalysis.topKeywords
    })

    return NextResponse.json({
      success: true,
      keywordAnalysis,
      optimizedMetadata,
      suggestions,
      readabilityScore: calculateReadability(content)
    })

  } catch (error) {
    logger.error('خطا در فرآیند بهینه‌سازی سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در انجام بهینه‌سازی' },
      { status: 500 }
    )
  }
}

// تابع تحلیل کلمات کلیدی
function analyzeKeywords(content: string, userKeywords?: string) {
  // پاکسازی محتوا از تگ‌های HTML
  const $ = cheerio.load(content)
  const textContent = $('body').text()

  // استخراج کلمات کلیدی با استفاده از TF-IDF
  const tfidf = new natural.TfIdf()
  tfidf.addDocument(textContent.toLowerCase())
  
  const keywords: Record<string, number> = {}
  tfidf.listTerms(0).forEach(item => {
    if (item.term.length > 3 && natural.PorterStemmer.stem(item.term) === item.term) {
      keywords[item.term] = item.tfidf
    }
  })

  // ترکیب با کلمات کلیدی کاربر
  const userKeywordsList = userKeywords?.split(',').map(k => k.trim().toLowerCase()) || []
  userKeywordsList.forEach(kw => {
    keywords[kw] = (keywords[kw] || 0) + 2 // وزن بیشتر به کلمات کاربر
  })

  // مرتب‌سازی بر اساس اهمیت
  const sortedKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term)

  return {
    topKeywords: sortedKeywords,
    keywordDensity: calculateKeywordDensity(textContent, sortedKeywords[0]),
    contentLength: textContent.length,
    wordCount: textContent.split(/\s+/).length
  }
}

// تابع تولید پیشنهادات بهینه‌سازی
function generateOptimizationSuggestions(data: {
  content: string,
  title: string,
  keywordAnalysis: ReturnType<typeof analyzeKeywords>,
  currentSeoData?: { metaTitle?: string, metaDescription?: string }
}) {
  const suggestions = []
  const { topKeywords, wordCount } = data.keywordAnalysis

  // پیشنهادات مربوط به عنوان
  if (data.title.length < 40) {
    suggestions.push({
      type: 'title',
      priority: 'high',
      message: 'عنوان کوتاه است (حداقل 40 کاراکتر توصیه می‌شود)',
      suggestion: `سعی کنید عنوان را با اضافه کردن کلمه کلیدی "${topKeywords[0]}" گسترش دهید`
    })
  }

  // پیشنهادات مربوط به محتوا
  if (wordCount < 800) {
    suggestions.push({
      type: 'content',
      priority: 'medium',
      message: `محتوای شما ${wordCount} کلمه است (حداقل 800 کلمه توصیه می‌شود)`,
      suggestion: 'مطالب بیشتری در مورد موضوع بنویسید یا مثال‌های عملی اضافه کنید'
    })
  }

  // پیشنهادات مربوط به کلمات کلیدی
  if (data.keywordAnalysis.keywordDensity < 0.5) {
    suggestions.push({
      type: 'keyword',
      priority: 'high',
      message: 'چگالی کلمه کلیدی اصلی کم است',
      suggestion: `کلمه "${topKeywords[0]}" را به صورت طبیعی در محتوا بیشتر استفاده کنید`
    })
  }

  // پیشنهادات مربوط به متادیتاها
  if (data.currentSeoData) {
    if (!data.currentSeoData.metaTitle) {
      suggestions.push({
        type: 'metadata',
        priority: 'high',
        message: 'عنوان سئو (meta title) تعیین نشده است',
        suggestion: `استفاده از عنوان "${data.title} | ${topKeywords.join(', ')}" را در نظر بگیرید`
      })
    }

    if (!data.currentSeoData.metaDescription) {
      const idealDescription = data.content.substring(0, 160)
      suggestions.push({
        type: 'metadata',
        priority: 'medium',
        message: 'توضیحات متا (meta description) تعیین نشده است',
        suggestion: `استفاده از این توضیح را در نظر بگیرید: "${idealDescription}"`
      })
    }
  }

  return suggestions.sort((a, b) => 
    a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0
  )
}

// تابع تولید متادیتاهای بهینه
function generateOptimizedMetadata(data: {
  title: string,
  content: string,
  keywordAnalysis: ReturnType<typeof analyzeKeywords>,
  currentSeoData?: { metaTitle?: string, metaDescription?: string }
}) {
  const { topKeywords } = data.keywordAnalysis
  const primaryKeyword = topKeywords[0]

  return {
    metaTitle: data.currentSeoData?.metaTitle || 
      `${data.title} | ${primaryKeyword} | سجاد اکبری`,
    metaDescription: data.currentSeoData?.metaDescription || 
      `${data.content.substring(0, 140)}...`,
    focusKeyword: primaryKeyword,
    secondaryKeywords: topKeywords.slice(1, 3)
  }
}

// تابع محاسبه خوانایی
function calculateReadability(content: string) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = content.split(/\s+/)
  const syllables = words.reduce((count, word) => 
    count + Math.max(1, word.length / 3), 0)

  const avgWordsPerSentence = words.length / sentences.length
  const avgSyllablesPerWord = syllables / words.length

  // محاسبه شاخص Flesch-Kincaid
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
  
  return Math.min(100, Math.max(0, Math.round(score)))
}

// تابع محاسبه چگالی کلمه کلیدی
function calculateKeywordDensity(content: string, keyword: string) {
  if (!keyword) return 0
  
  const words = content.toLowerCase().split(/\s+/)
  const keywordCount = words.filter(w => w.includes(keyword.toLowerCase())).length
  return parseFloat(((keywordCount / words.length) * 100).toFixed(2))
}
