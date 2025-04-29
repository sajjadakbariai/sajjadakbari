import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { postUpdateSchema } from '@/lib/validationSchemas'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // افزایش تعداد بازدیدها
    await prisma.post.update({
      where: { id: params.id },
      data: { views: { increment: 1 } }
    })

    // دریافت پست با تمام اطلاعات مرتبط
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            seo: true
          }
        },
        seo: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'پست مورد نظر یافت نشد' },
        { status: 404 }
      )
    }

    // ساختار پاسخ بهینه‌شده
    const response = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      category: post.category,
      seo: post.seo || {
        metaTitle: post.title,
        metaDescription: post.content.substring(0, 160),
        openGraphImage: null
      },
      author: post.author,
      tags: post.tags,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      views: post.views + 1 // بازدید فعلی
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('خطا در دریافت پست', {
      postId: params.id,
      error: error instanceof Error ? error.message : error
    })
    
    return NextResponse.json(
      { error: 'خطا در دریافت پست' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // احراز هویت و بررسی دسترسی
    const currentUser = await getCurrentUser()
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!currentUser || (currentUser.id !== post?.authorId && !currentUser.isAdmin)) {
      return NextResponse.json(
        { error: 'شما مجوز ویرایش این پست را ندارید' },
        { status: 403 }
      )
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json()
    const validation = await postUpdateSchema.safeParseAsync(body)
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای ویرایش پست', {
        postId: params.id,
        errors: validation.error.errors
      })
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      )
    }

    // بررسی یکتایی slug
    if (body.slug && body.slug !== post?.slug) {
      const slugExists = await prisma.post.findFirst({
        where: { slug: body.slug, NOT: { id: params.id } }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'این slug قبلا استفاده شده است' },
          { status: 400 }
        )
      }
    }

    // به‌روزرسانی پست با تراکنش
    const { seo, ...postData } = validation.data
    const result = await prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id: params.id },
        data: postData
      })

      // مدیریت اطلاعات سئو
      if (seo) {
        await prisma.postSEO.upsert({
          where: { postId: params.id },
          update: seo,
          create: {
            ...seo,
            postId: params.id
          }
        })
      }

      return updatedPost
    })

    logger.info('پست با موفقیت ویرایش شد', {
      postId: result.id,
      userId: currentUser.id
    })

    return NextResponse.json(result)

  } catch (error) {
    logger.error('خطا در ویرایش پست', {
      postId: params.id,
      error: error instanceof Error ? error.message : error
    })
    
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی پست' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // احراز هویت و بررسی دسترسی
    const currentUser = await getCurrentUser()
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!currentUser || (currentUser.id !== post?.authorId && !currentUser.isAdmin)) {
      return NextResponse.json(
        { error: 'شما مجوز حذف این پست را ندارید' },
        { status: 403 }
      )
    }

    // حذف پست با تراکنش
    await prisma.$transaction([
      prisma.postSEO.deleteMany({ where: { postId: params.id } }),
      prisma.post.delete({ where: { id: params.id } })
    ])

    logger.info('پست با موفقیت حذف شد', {
      postId: params.id,
      userId: currentUser.id
    })

    return NextResponse.json(
      { message: 'پست با موفقیت حذف شد' },
      { status: 200 }
    )

  } catch (error) {
    logger.error('خطا در حذف پست', {
      postId: params.id,
      error: error instanceof Error ? error.message : error
    })
    
    return NextResponse.json(
      { error: 'خطا در حذف پست' },
      { status: 500 }
    )
  }
}
