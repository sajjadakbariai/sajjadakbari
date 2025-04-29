import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { postSchema } from '@/lib/validationSchemas'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'برای ایجاد پست باید وارد شوید' },
        { status: 401 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = await postSchema.safeParseAsync(body)
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای ایجاد پست', {
        errors: validation.error.errors,
        userId: currentUser.id
      })
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    // ایجاد پست جدید با تراکنش
    const result = await prisma.$transaction(async (prisma) => {
      const { seo, ...postData } = validation.data
      
      // ایجاد پست اصلی
      const newPost = await prisma.post.create({
        data: {
          ...postData,
          authorId: currentUser.id
        }
      })

      // ایجاد رکورد سئو اگر داده وجود دارد
      if (seo) {
        await prisma.postSEO.create({
          data: {
            ...seo,
            postId: newPost.id
          }
        })
      }

      return newPost
    })

    logger.info('پست جدید ایجاد شد', { 
      postId: result.id,
      userId: currentUser.id 
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    logger.error('خطا در ایجاد پست', { error })
    
    return NextResponse.json(
      { error: 'خطای سرور در ایجاد پست' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // پارامترهای جستجو و صفحه‌بندی
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const sort = searchParams.get('sort') || 'newest'

    // محاسبه صفحات و تنظیمات جستجو
    const skip = (page - 1) * limit
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (category) {
      where.categoryId = category
    }

    // تنظیمات مرتب‌سازی
    const orderBy: any = {}
    if (sort === 'newest') {
      orderBy.createdAt = 'desc'
    } else if (sort === 'oldest') {
      orderBy.createdAt = 'asc'
    }

    // دریافت پست‌ها با اطلاعات مرتبط
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          seo: true,
          author: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy
      }),
      prisma.post.count({ where })
    ])

    // ساختار پاسخ
    const response = {
      data: posts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.content.substring(0, 150) + '...',
        category: post.category,
        author: post.author,
        seo: post.seo,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      })),
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('خطا در دریافت پست‌ها', { error })
    
    return NextResponse.json(
      { error: 'خطا در دریافت پست‌ها' },
      { status: 500 }
    )
  }
}
