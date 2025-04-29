import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { categoryUpdateSchema } from '@/lib/validationSchemas';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // دریافت دسته‌بندی با اطلاعات سئو
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        seo: true,
        _count: { select: { posts: true } }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    // ساختار پاسخ بهینه‌شده
    const responseData = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      postsCount: category._count.posts,
      seo: category.seo || null,
      createdAt: category.createdAt
    };

    return NextResponse.json(responseData);

  } catch (error) {
    logger.error('خطا در دریافت دسته‌بندی', { 
      categoryId: params.id, 
      error 
    });
    return NextResponse.json(
      { error: 'خطا در دریافت داده‌ها' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز: تنها مدیران می‌توانند دسته‌بندی را ویرایش کنند' },
        { status: 403 }
      );
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json();
    const validation = await categoryUpdateSchema.safeParseAsync(body);
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای ویرایش دسته‌بندی', {
        categoryId: params.id,
        errors: validation.error.errors
      });
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      );
    }

    // بررسی وجود دسته‌بندی
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    // اعتبارسنجی یکتایی slug
    if (body.slug && body.slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findFirst({
        where: { slug: body.slug, NOT: { id: params.id } }
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'این slug قبلا استفاده شده است' },
          { status: 400 }
        );
      }
    }

    // ویرایش دسته‌بندی
    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: validation.data,
      select: {
        id: true,
        name: true,
        slug: true,
        updatedAt: true
      }
    });

    logger.info('دسته‌بندی ویرایش شد', { 
      categoryId: updatedCategory.id,
      userId: currentUser.id 
    });

    return NextResponse.json(updatedCategory);

  } catch (error) {
    logger.error('خطا در ویرایش دسته‌بندی', { 
      categoryId: params.id, 
      error 
    });
    
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی دسته‌بندی' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز: تنها مدیران می‌توانند دسته‌بندی را حذف کنند' },
        { status: 403 }
      );
    }

    // بررسی وجود دسته‌بندی
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { posts: true } } }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    // بررسی وجود پست‌های مرتبط
    if (category._count.posts > 0) {
      return NextResponse.json(
        { error: 'امکان حذف دسته‌بندی با پست‌های فعال وجود ندارد' },
        { status: 400 }
      );
    }

    // حذف دسته‌بندی و داده‌های سئوی مرتبط
    await prisma.$transaction([
      prisma.categorySEO.deleteMany({ where: { categoryId: params.id } }),
      prisma.category.delete({ where: { id: params.id } })
    ]);

    logger.info('دسته‌بندی حذف شد', { 
      categoryId: params.id,
      userId: currentUser.id 
    });

    return NextResponse.json(
      { message: 'دسته‌بندی با موفقیت حذف شد' },
      { status: 200 }
    );

  } catch (error) {
    logger.error('خطا در حذف دسته‌بندی', { 
      categoryId: params.id, 
      error 
    });
    
    return NextResponse.json(
      { error: 'خطا در حذف دسته‌بندی' },
      { status: 500 }
    );
  }
}
