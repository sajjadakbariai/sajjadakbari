import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import axios from 'axios'
import * as cheerio from 'cheerio'

// اسکیمای اعتبارسنجی برای ممیزی سئو
const auditSchema = z.object({
  url: z.string().url(),
  analyzeContent: z.boolean().default(true),
  analyzeTechnical: z.boolean().default(true),
  analyzeLinks: z.boolean().default(false)
})

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند از سیستم ممیزی استفاده کنند' },
        { status: 403 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = auditSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { url, analyzeContent, analyzeTechnical, analyzeLinks } = validation.data

    // دریافت محتوای صفحه
    const startTime = Date.now()
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' }
    })
    const loadTime = Date.now() - startTime
    const $ = cheerio.load(response.data)

    // اجرای ممیزی‌های مختلف
    const [contentAudit, technicalAudit, linksAudit] = await Promise.all([
      analyzeContent ? runContentAudit($, url) : Promise.resolve(null),
      analyzeTechnical ? runTechnicalAudit($, response, loadTime) : Promise.resolve(null),
      analyzeLinks ? runLinksAudit($, url) : Promise.resolve(null)
    ])

    // ذخیره نتایج ممیزی
    const auditResult = await prisma.seoAudit.create({
      data: {
        url,
        userId: currentUser.id,
        results: {
          content: contentAudit,
          technical: technicalAudit,
          links: linksAudit,
          performance: { loadTime }
        }
      }
    })

    logger.info('ممیزی سئو انجام شد', {
      url,
      userId: currentUser.id,
      duration: `${Date.now() - startTime}ms`
    })

    return NextResponse.json({
      success: true,
      auditId: auditResult.id,
      url,
      contentAudit,
      technicalAudit,
      linksAudit,
      performance: { loadTime }
    })

  } catch (error) {
    logger.error('خطا در انجام ممیزی سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در انجام ممیزی سئو', details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

// تابع ممیزی محتوا
async function runContentAudit($: cheerio.Root, url: string) {
  const content = $('body').text()
  const title = $('title').text() || ''
  const metaDescription = $('meta[name="description"]').attr('content') || ''
  const h1 = $('h1').map((_, el) => $(el).text()).get()
  const h2 = $('h2').map((_, el) => $(el).text()).get()
  const images = $('img').map((_, el) => ({
    src: $(el).attr('src'),
    alt: $(el).attr('alt') || ''
  })).get()

  // تحلیل محتوا
  const issues = []
  const wordCount = content.split(/\s+/).length

  // بررسی عنوان
  if (!title) {
    issues.push({
      type: 'content',
      severity: 'high',
      message: 'صفحه فاقد تگ عنوان (Title) است',
      suggestion: 'یک عنوان جذاب و حاوی کلمه کلیدی اصلی اضافه کنید'
    })
  } else if (title.length > 60) {
    issues.push({
      type: 'content',
      severity: 'medium',
      message: 'عنوان صفحه بسیار طولانی است',
      suggestion: 'عنوان را به کمتر از 60 کاراکتر کاهش دهید'
    })
  }

  // بررسی توضیحات متا
  if (!metaDescription) {
    issues.push({
      type: 'content',
      severity: 'medium',
      message: 'صفحه فاقد توضیحات متا (Meta Description) است',
      suggestion: 'توضیحات متای جذابی با 120-160 کاراکتر ایجاد کنید'
    })
  }

  // بررسی هدینگ‌ها
  if (h1.length === 0) {
    issues.push({
      type: 'content',
      severity: 'high',
      message: 'صفحه فاقد تگ H1 است',
      suggestion: 'حداقل یک تگ H1 حاوی کلمه کلیدی اصلی اضافه کنید'
    })
  } else if (h1.length > 1) {
    issues.push({
      type: 'content',
      severity: 'medium',
      message: 'صفحه دارای چندین تگ H1 است',
      suggestion: 'تنها یک تگ H1 اصلی در صفحه داشته باشید'
    })
  }

  // بررسی تصاویر
  const imagesWithoutAlt = images.filter(img => !img.alt)
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: 'content',
      severity: 'medium',
      message: `${imagesWithoutAlt.length} تصویر فاقد متن جایگزین (Alt Text)`,
      suggestion: 'برای تمام تصاویر متن جایگزین توصیفی اضافه کنید'
    })
  }

  // بررسی طول محتوا
  if (wordCount < 300) {
    issues.push({
      type: 'content',
      severity: 'medium',
      message: 'محتوای صفحه بسیار کوتاه است',
      suggestion: 'محتوای خود را به حداقل 300 کلمه افزایش دهید'
    })
  }

  return {
    wordCount,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    headings: { h1, h2 },
    imagesCount: images.length,
    imagesWithoutAltCount: imagesWithoutAlt.length,
    issues
  }
}

// تابع ممیزی فنی
async function runTechnicalAudit($: cheerio.Root, response: any, loadTime: number) {
  const issues = []
  const headers = response.headers

  // بررسی سرعت لود
  if (loadTime > 3000) {
    issues.push({
      type: 'technical',
      severity: 'high',
      message: 'زمان بارگذاری صفحه بسیار طولانی است',
      suggestion: 'بهینه‌سازی تصاویر، فعال کردن کش و فشرده‌سازی را بررسی کنید'
    })
  }

  // بررسی ریسپانسیو بودن
  const viewport = $('meta[name="viewport"]').attr('content')
  if (!viewport) {
    issues.push({
      type: 'technical',
      severity: 'high',
      message: 'صفحه فاقد متا تگ viewport است',
      suggestion: 'متا تگ viewport را برای پشتیبانی از دستگاه‌های موبایل اضافه کنید'
    })
  }

  // بررسی ساختار URL
  const canonical = $('link[rel="canonical"]').attr('href')
  if (!canonical) {
    issues.push({
      type: 'technical',
      severity: 'medium',
      message: 'صفحه فاقد لینک canonical است',
      suggestion: 'یک لینک canonical برای جلوگیری از محتوای تکراری اضافه کنید'
    })
  }

  // بررسی وضعیت ایندکس
  const robotsMeta = $('meta[name="robots"]').attr('content')
  if (robotsMeta?.includes('noindex')) {
    issues.push({
      type: 'technical',
      severity: 'high',
      message: 'صفحه دارای تگ noindex است',
      suggestion: 'در صورت نیاز به ایندکس شدن، این تگ را حذف کنید'
    })
  }

  return {
    loadTime,
    isResponsive: !!viewport,
    hasCanonical: !!canonical,
    indexingAllowed: !robotsMeta?.includes('noindex'),
    headers: {
      contentEncoding: headers['content-encoding'],
      cacheControl: headers['cache-control']
    },
    issues
  }
}

// تابع ممیزی لینک‌ها
async function runLinksAudit($: cheerio.Root, baseUrl: string) {
  const issues = []
  const links = $('a').map((_, el) => ({
    href: $(el).attr('href'),
    text: $(el).text(),
    rel: $(el).attr('rel'),
    target: $(el).attr('target')
  })).get()

  // فیلتر لینک‌های معتبر
  const validLinks = links.filter(link => 
    link.href && 
    !link.href.startsWith('#') && 
    !link.href.startsWith('javascript:')
  )

  // دسته‌بندی لینک‌ها
  const internalLinks = validLinks.filter(link => 
    link.href?.startsWith('/') || link.href?.includes(baseUrl)
  )
  const externalLinks = validLinks.filter(link => 
    !link.href?.startsWith('/') && !link.href?.includes(baseUrl)
  )
  const nofollowLinks = validLinks.filter(link => link.rel?.includes('nofollow'))

  // بررسی لینک‌های شکسته (شبیه‌سازی)
  const brokenLinks = await findBrokenLinks(internalLinks)

  if (brokenLinks.length > 0) {
    issues.push({
      type: 'links',
      severity: 'high',
      message: `${brokenLinks.length} لینک داخلی شکسته یافت شد`,
      suggestion: 'لینک‌های شکسته را تعمیر یا حذف کنید'
    })
  }

  return {
    totalLinks: validLinks.length,
    internalLinks: internalLinks.length,
    externalLinks: externalLinks.length,
    nofollowLinks: nofollowLinks.length,
    brokenLinks: brokenLinks.length,
    issues
  }
}

// تابع شبیه‌سازی یافتن لینک‌های شکسته
async function findBrokenLinks(links: any[]) {
  // در محیط واقعی اینجا درخواست‌های HTTP برای بررسی وضعیت لینک‌ها ارسال می‌شود
  // این یک پیاده‌سازی نمونه است که تصادفی برخی لینک‌ها را شکسته نشان می‌دهد
  return links
    .filter((_, index) => index % 10 === 0) // هر 10مین لینک را شکسته در نظر بگیر
    .slice(0, 3) // حداکثر 3 لینک شکسته نشان بده
}
