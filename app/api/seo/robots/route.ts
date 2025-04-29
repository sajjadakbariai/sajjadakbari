import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    // دریافت تنظیمات جهانی robots از دیتابیس
    const globalSettings = await prisma.globalSEO.findFirst({
      select: { robotsTxt: true }
    })

    // دریافت مسیرهای noindex از دیتابیس
    const noIndexRoutes = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN "postId" IS NOT NULL THEN CONCAT('/posts/', (SELECT slug FROM "Post" WHERE id = "postId"))
          WHEN "pageId" IS NOT NULL THEN CONCAT('/pages/', (SELECT slug FROM "Page" WHERE id = "pageId"))
          WHEN "categoryId" IS NOT NULL THEN CONCAT('/categories/', (SELECT slug FROM "Category" WHERE id = "categoryId"))
        END as path
      FROM "SEOItem"
      WHERE "noIndex" = true
    `

    // تولید محتوای robots.txt
    let robotsContent = globalSettings?.robotsTxt || `
# Default robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
`

    // افزودن مسیرهای noindex به robots.txt
    if (noIndexRoutes && noIndexRoutes.length > 0) {
      robotsContent += '\n\n# NoIndex Routes\n'
      noIndexRoutes.forEach((route: { path: string }) => {
        robotsContent += `Disallow: ${route.path}\n`
      })
    }

    // افزودن نقشه سایت
    robotsContent += `\nSitemap: https://sajjadakbari.ir/sitemap.xml`

    logger.info('robots.txt generated successfully', {
      noIndexCount: noIndexRoutes?.length || 0
    })

    return new NextResponse(robotsContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400' // کش 24 ساعته
      }
    })

  } catch (error) {
    logger.error('خطا در تولید robots.txt', { error })
    
    // برگرداندن نسخه پیش‌فرض در صورت خطا
    return new NextResponse(`
User-agent: *
Allow: /
Disallow: /admin/
Sitemap: https://sajjadakbari.ir/sitemap.xml
`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 500
    })
  }
}

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند robots.txt را ویرایش کنند' },
        { status: 403 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const content = await request.text()
    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'محتوی robots.txt نمی‌تواند بیش از 5000 کاراکتر باشد' },
        { status: 400 }
      )
    }

    // ذخیره تنظیمات در دیتابیس
    await prisma.globalSEO.upsert({
      where: { id: '1' },
      update: { robotsTxt: content },
      create: { 
        id: '1',
        robotsTxt: content 
      }
    })

    logger.info('robots.txt updated successfully', {
      userId: currentUser.id,
      contentLength: content.length
    })

    return NextResponse.json(
      { message: 'robots.txt با موفقیت به‌روزرسانی شد' },
      { status: 200 }
    )

  } catch (error) {
    logger.error('خطا در به‌روزرسانی robots.txt', { error })
    
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی robots.txt' },
      { status: 500 }
    )
  }
}
