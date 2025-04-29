import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند به داشبورد سئو دسترسی داشته باشند' },
        { status: 403 }
      )
    }

    // دریافت آمار کلی از دیتابیس
    const [contentStats, technicalIssues, latestAudits] = await Promise.all([
      // آمار محتوا
      prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN "seoId" IS NULL THEN 1 ELSE 0 END) as without_seo,
          AVG(LENGTH(content)) as avg_length
        FROM "Post"
      `,
      
      // مشکلات فنی
      prisma.seoIssue.groupBy({
        by: ['severity'],
        _count: { _all: true },
        where: { type: 'technical' }
      }),
      
      // آخرین ممیزی‌ها
      prisma.seoAudit.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } }
      })
    ])

    // دریافت روند تغییرات
    const trends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*) as count,
        AVG((results->>'performance'->>'loadTime')::numeric) as avg_load_time
      FROM "SeoAudit"
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `

    return NextResponse.json({
      contentStats: contentStats[0],
      technicalIssues,
      latestAudits,
      trends
    })

  } catch (error) {
    logger.error('خطا در دریافت داده‌های داشبورد سئو', { error })
    
    return NextResponse.json(
      { error: 'خطا در دریافت داده‌های داشبورد' },
      { status: 500 }
    )
  }
}
