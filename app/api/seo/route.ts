import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// اسکیمای اعتبارسنجی برای مدیریت سئو
const seoManagementSchema = z.object({
  entityType: z.enum(['POST', 'PAGE', 'CATEGORY']),
  entityId: z.string(),
  metaTitle: z.string().max(100).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  canonicalUrl: z.string().url().optional(),
  noIndex: z.boolean().optional(),
  openGraphImage: z.string().url().optional(),
  twitterCard: z.object({
    cardType: z.enum(['summary', 'summary_large_image', 'app', 'player']),
    site: z.string().optional(),
    creator: z.string().optional()
  }).optional(),
  schemaMarkup: z.record(z.any()).optional()
})

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند تنظیمات سئو را تغییر دهند' },
        { status: 403 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = seoManagementSchema.safeParse(body)
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای تنظیمات سئو', {
        errors: validation.error.errors
      })
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { entityType, entityId, ...seoData } = validation.data

    // تعیین مدل بر اساس نوع موجودیت
    let model: 'postSEO' | 'pageSEO' | 'categorySEO'
    switch (entityType) {
      case 'POST': model = 'postSEO'; break
      case 'PAGE': model = 'pageSEO'; break
      case 'CATEGORY': model = 'categorySEO'; break
    }

    // ایجاد یا به‌روزرسانی تنظیمات سئو
    const result = await prisma[model].upsert({
      where: { [`${entityType.toLowerCase()}Id`]: entityId },
      update: seoData,
      create: {
        ...seoData,
        [`${entityType.toLowerCase()}Id`]: entityId
      }
    })

    logger.info('تنظیمات سئو با موفقیت ذخیره شد', {
      entityType,
      entityId,
      userId: currentUser.id
    })

    return NextResponse.json(result)

  } catch (error) {
    logger.error('خطا در ذخیره تنظیمات سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در ذخیره تنظیمات سئو' },
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

    // اعتبارسنجی پارامترها
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'پارامترهای entityType و entityId الزامی هستند' },
        { status: 400 }
      )
    }

    // تعیین مدل بر اساس نوع موجودیت
    let model: 'postSEO' | 'pageSEO' | 'categorySEO'
    switch (entityType) {
      case 'POST': model = 'postSEO'; break
      case 'PAGE': model = 'pageSEO'; break
      case 'CATEGORY': model = 'categorySEO'; break
      default:
        return NextResponse.json(
          { error: 'نوع موجودیت نامعتبر است' },
          { status: 400 }
        )
    }

    // دریافت تنظیمات سئو
    const seoData = await prisma[model].findUnique({
      where: { [`${entityType.toLowerCase()}Id`]: entityId }
    })

    // اگر تنظیمات وجود نداشت، یک ساختار پیش‌فرض برگردان
    if (!seoData) {
      let defaultTitle = ''
      let defaultDescription = ''

      // دریافت اطلاعات پایه برای ساخت پیش‌فرض‌ها
      if (entityType === 'POST') {
        const post = await prisma.post.findUnique({
          where: { id: entityId },
          select: { title: true, content: true }
        })
        defaultTitle = post?.title || ''
        defaultDescription = post?.content.substring(0, 160) || ''
      }

      return NextResponse.json({
        metaTitle: defaultTitle,
        metaDescription: defaultDescription,
        noIndex: false
      })
    }

    return NextResponse.json(seoData)

  } catch (error) {
    logger.error('خطا در دریافت تنظیمات سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در دریافت تنظیمات سئو' },
      { status: 500 }
    )
  }
}

// endpoint برای تولید sitemap.xml
export async function PUT(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند sitemap را به‌روزرسانی کنند' },
        { status: 403 }
      )
    }

    // دریافت تمام محتواهای قابل ایندکس
    const [posts, pages, categories] = await Promise.all([
      prisma.post.findMany({
        where: { 
          seo: { noIndex: false } 
        },
        select: { 
          slug: true, 
          updatedAt: true,
          seo: true
        }
      }),
      prisma.page.findMany({
        where: { 
          seo: { noIndex: false } 
        },
        select: { 
          slug: true, 
          updatedAt: true 
        }
      }),
      prisma.category.findMany({
        where: { 
          seo: { noIndex: false } 
        },
        select: { 
          slug: true, 
          updatedAt: true 
        }
      })
    ])

    // ساختار sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${[
          ...posts.map(post => `
            <url>
              <loc>https://sajjadakbari.ir/posts/${post.slug}</loc>
              <lastmod>${post.updatedAt.toISOString()}</lastmod>
              <changefreq>weekly</changefreq>
              <priority>0.8</priority>
            </url>
          `),
          ...pages.map(page => `
            <url>
              <loc>https://sajjadakbari.ir/pages/${page.slug}</loc>
              <lastmod>${page.updatedAt.toISOString()}</lastmod>
              <changefreq>monthly</changefreq>
              <priority>0.6</priority>
            </url>
          `),
          ...categories.map(category => `
            <url>
              <loc>https://sajjadakbari.ir/categories/${category.slug}</loc>
              <lastmod>${category.updatedAt.toISOString()}</lastmod>
              <changefreq>weekly</changefreq>
              <priority>0.7</priority>
            </url>
          `)
        ].join('')}
      </urlset>
    `

    // ذخیره sitemap در سیستم (می‌تواند در دیتابیس یا فایل سیستم ذخیره شود)
    // در اینجا فقط لاگ می‌کنیم
    logger.info('Sitemap generated successfully', {
      postCount: posts.length,
      pageCount: pages.length,
      categoryCount: categories.length
    })

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml'
      }
    })

  } catch (error) {
    logger.error('خطا در تولید sitemap', { error })
    
    return NextResponse.json(
      { error: 'خطا در تولید sitemap' },
      { status: 500 }
    )
  }
}
