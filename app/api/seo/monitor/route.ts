import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// اسکیمای اعتبارسنجی برای پارامترهای مانیتورینگ
const monitorSchema = z.object({
  days: z.number().min(1).max(365).default(30),
  type: z.enum(['ALL', 'ERRORS', 'WARNINGS']).default('ALL'),
  entityType: z.enum(['POST', 'PAGE', 'CATEGORY']).optional()
})

export async function GET(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: 'تنها مدیران می‌توانند به داده‌های مانیتورینگ دسترسی داشته باشند' },
        { status: 403 }
      )
    }

    // اعتبارسنجی پارامترهای جستجو
    const { searchParams } = new URL(request.url)
    const validation = monitorSchema.safeParse({
      days: parseInt(searchParams.get('days') || '30'),
      type: searchParams.get('type') || 'ALL',
      entityType: searchParams.get('entityType') || undefined
    })
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'پارامترهای نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { days, type, entityType } = validation.data
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - days)

    // دریافت داده‌های مانیتورینگ از دیتابیس
    const [issues, stats] = await Promise.all([
      // دریافت مشکلات سئو
      prisma.seoIssue.findMany({
        where: {
          createdAt: { gte: dateThreshold },
          severity: type === 'ALL' ? undefined : type,
          entityType: entityType || undefined
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      
      // دریافت آمار کلی
      prisma.seoIssue.groupBy({
        by: ['severity'],
        where: {
          createdAt: { gte: dateThreshold },
          entityType: entityType || undefined
        },
        _count: { _all: true }
      })
    ])

    // تحلیل داده‌ها
    const analysis = {
      total: issues.length,
      errors: stats.find(s => s.severity === 'ERROR')?._count._all || 0,
      warnings: stats.find(s => s.severity === 'WARNING')?._count._all || 0,
      byEntity: issues.reduce((acc, issue) => {
        acc[issue.entityType] = (acc[issue.entityType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      commonIssues: issues
        .reduce((acc, issue) => {
          const key = issue.message
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {} as Record<string, number>)
    }

    logger.info('گزارش مانیتورینگ سئو ایجاد شد', {
      userId: currentUser.id,
      days,
      type,
      entityType
    })

    return NextResponse.json({
      meta: { days, type, entityType, generatedAt: new Date().toISOString() },
      issues,
      analysis
    })

  } catch (error) {
    logger.error('خطا در دریافت داده‌های مانیتورینگ', { error })
    
    return NextResponse.json(
      { error: 'خطا در دریافت داده‌های مانیتورینگ' },
      { status: 500 }
    )
  }
}

// تابع کمکی برای ثبت مشکلات سئو
export async function logSeoIssue(data: {
  entityType: 'POST' | 'PAGE' | 'CATEGORY'
  entityId: string
  message: string
  severity: 'ERROR' | 'WARNING'
  details?: Record<string, any>
}) {
  try {
    await prisma.seoIssue.create({
      data: {
        ...data,
        details: data.details || {}
      }
    })
  } catch (error) {
    logger.error('خطا در ثبت مشکل سئو', { error, originalData: data })
  }
}

// تابع بررسی سلامت سئو
export async function runSeoHealthCheck() {
  try {
    const checkStartTime = new Date()
    
    // 1. بررسی پست‌های بدون عنوان سئو
    const postsWithoutMetaTitle = await prisma.post.findMany({
      where: {
        seo: {
          OR: [
            { metaTitle: null },
            { metaTitle: '' }
          ]
        }
      },
      take: 50
    })

    for (const post of postsWithoutMetaTitle) {
      await logSeoIssue({
        entityType: 'POST',
        entityId: post.id,
        message: 'پست بدون عنوان سئو',
        severity: 'WARNING',
        details: {
          suggestion: `از عنوان '${post.title.substring(0, 30)}...' به عنوان عنوان سئو استفاده کنید`
        }
      })
    }

    // 2. بررسی صفحات با محتوای تکراری
    const duplicateContent = await prisma.$queryRaw`
      SELECT p1.id, p1.slug, COUNT(*) as duplicates
      FROM "Post" p1
      JOIN "Post" p2 ON 
        SIMILARITY(p1.content, p2.content) > 0.8 AND 
        p1.id != p2.id
      GROUP BY p1.id
      HAVING COUNT(*) > 0
      LIMIT 20
    `

    for (const post of duplicateContent as any[]) {
      await logSeoIssue({
        entityType: 'POST',
        entityId: post.id,
        message: 'محتوای تکراری تشخیص داده شد',
        severity: 'ERROR',
        details: {
          duplicates: post.duplicates,
          slug: post.slug
        }
      })
    }

    // 3. بررسی تصاویر بدون متن جایگزین
    const postsWithImages = await prisma.post.findMany({
      where: {
        content: { contains: '![' }
      },
      select: { id: true, content: true }
    })

    const postsWithoutAltText = postsWithImages.filter(post => {
      const images = post.content.match(/!\[(.*?)\]\(.*?\)/g) || []
      return images.some(img => !img.includes('![') || img.includes('![]('))
    })

    for (const post of postsWithoutAltText.slice(0, 20)) {
      await logSeoIssue({
        entityType: 'POST',
        entityId: post.id,
        message: 'تصویر بدون متن جایگزین (alt text)',
        severity: 'WARNING'
      })
    }

    logger.info('بررسی سلامت سئو انجام شد', {
      duration: `${new Date().getTime() - checkStartTime.getTime()}ms`,
      issuesFound: postsWithoutMetaTitle.length + duplicateContent.length + postsWithoutAltText.length
    })

    return {
      success: true,
      stats: {
        postsWithoutMetaTitle: postsWithoutMetaTitle.length,
        duplicateContent: duplicateContent.length,
        postsWithoutAltText: postsWithoutAltText.length
      }
    }
  } catch (error) {
    logger.error('خطا در اجرای بررسی سلامت سئو', { error })
    return { success: false }
  }
}
