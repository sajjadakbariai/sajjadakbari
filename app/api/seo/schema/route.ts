import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// اسکیمای اعتبارسنجی برای داده‌های ساختاریافته
const schemaMarkupSchema = z.object({
  entityType: z.enum(['POST', 'PAGE', 'CATEGORY', 'CUSTOM']),
  entityId: z.string().optional(),
  schemaType: z.enum([
    'Article',
    'NewsArticle',
    'BlogPosting',
    'WebPage',
    'AboutPage',
    'ContactPage',
    'BreadcrumbList',
    'FAQPage',
    'Product'
  ]),
  markupData: z.record(z.any())
})

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند داده‌های ساختاریافته را ویرایش کنند' },
        { status: 403 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = schemaMarkupSchema.safeParse(body)
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای داده‌های ساختاریافته', {
        errors: validation.error.errors
      })
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { entityType, entityId, schemaType, markupData } = validation.data

    // ذخیره داده‌های ساختاریافته
    let result
    switch (entityType) {
      case 'POST':
        result = await prisma.postSEO.upsert({
          where: { postId: entityId },
          update: { schemaType, schemaMarkup: markupData },
          create: {
            postId: entityId,
            schemaType,
            schemaMarkup: markupData
          }
        })
        break
        
      case 'PAGE':
        result = await prisma.pageSEO.upsert({
          where: { pageId: entityId },
          update: { schemaType, schemaMarkup: markupData },
          create: {
            pageId: entityId,
            schemaType,
            schemaMarkup: markupData
          }
        })
        break
        
      case 'CATEGORY':
        result = await prisma.categorySEO.upsert({
          where: { categoryId: entityId },
          update: { schemaType, schemaMarkup: markupData },
          create: {
            categoryId: entityId,
            schemaType,
            schemaMarkup: markupData
          }
        })
        break
        
      case 'CUSTOM':
        result = await prisma.customSchema.create({
          data: {
            schemaType,
            schemaMarkup: markupData,
            createdBy: currentUser.id
          }
        })
        break
    }

    logger.info('داده‌های ساختاریافته با موفقیت ذخیره شد', {
      entityType,
      entityId,
      schemaType,
      userId: currentUser.id
    })

    return NextResponse.json(result)

  } catch (error) {
    logger.error('خطا در ذخیره داده‌های ساختاریافته', { error })
    
    return NextResponse.json(
      { error: 'خطا در ذخیره داده‌های ساختاریافته' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // پارامترهای جستجو
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    // دریافت داده‌های ساختاریافته
    let schemaData
    switch (entityType) {
      case 'POST':
        schemaData = await prisma.postSEO.findUnique({
          where: { postId: entityId },
          select: { schemaType: true, schemaMarkup: true }
        })
        break
        
      case 'PAGE':
        schemaData = await prisma.pageSEO.findUnique({
          where: { pageId: entityId },
          select: { schemaType: true, schemaMarkup: true }
        })
        break
        
      case 'CATEGORY':
        schemaData = await prisma.categorySEO.findUnique({
          where: { categoryId: entityId },
          select: { schemaType: true, schemaMarkup: true }
        })
        break
        
      default:
        // دریافت اسکیمای عمومی
        schemaData = await prisma.customSchema.findMany({
          select: { schemaType: true, schemaMarkup: true }
        })
    }

    // تولید JSON-LD
    const generateJSONLD = (data: any) => {
      if (Array.isArray(data)) {
        return data.map(item => ({
          '@context': 'https://schema.org',
          '@type': item.schemaType,
          ...item.schemaMarkup
        }))
      }
      return {
        '@context': 'https://schema.org',
        '@type': data?.schemaType,
        ...data?.schemaMarkup
      }
    }

    const jsonLD = generateJSONLD(schemaData)

    return NextResponse.json(jsonLD, {
      headers: {
        'Content-Type': 'application/ld+json'
      }
    })

  } catch (error) {
    logger.error('خطا در دریافت داده‌های ساختاریافته', { error })
    
    return NextResponse.json(
      { error: 'خطا در دریافت داده‌های ساختاریافته' },
      { status: 500 }
    )
  }
}

// تابع کمکی برای تولید اسکیمای پیش‌فرض
export async function generateDefaultSchema(entityType: string, entityId: string) {
  let defaultSchema
  
  switch (entityType) {
    case 'POST':
      const post = await prisma.post.findUnique({
        where: { id: entityId },
        include: {
          author: { select: { name: true } },
          category: { select: { name: true } }
        }
      })
      
      if (post) {
        defaultSchema = {
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.content.substring(0, 200),
          datePublished: post.createdAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: {
            '@type': 'Person',
            name: post.author?.name
          },
          publisher: {
            '@type': 'Organization',
            name: 'Sajjad Akbari'
          }
        }
      }
      break
      
    case 'PAGE':
      const page = await prisma.page.findUnique({
        where: { id: entityId }
      })
      
      if (page) {
        defaultSchema = {
          '@type': 'WebPage',
          headline: page.title,
          description: page.content.substring(0, 200)
        }
      }
      break
  }
  
  return defaultSchema
}
