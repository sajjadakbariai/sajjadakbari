import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { categorySchema } from '@/lib/validationSchemas';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    // احراز هویت کاربر
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز: تنها مدیران می‌توانند دسته‌بندی ایجاد کنند' },
        { status: 403 }
      );
    }

    // اعتبارسنجی داده‌های ورودی
    const body = await request.json();
    const validation = await categorySchema.safeParseAsync(body);
    
    if (!validation.success) {
      logger.warn('اعتبارسنجی ناموفق برای ایجاد دسته‌بندی', {
        errors: validation.error.errors,
        input: body
      });
      return NextResponse.json(
        { error: 'داده‌های نامعتبر', details: validation.error.errors },
        { status: 400 }
      );
    }

    // ایجاد دسته‌بندی جدید
    const { name, slug } = validation.data;
    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        createdBy: currentUser.id
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true
      }
    });

    logger.info('دسته‌بندی جدید ایجاد شد', { 
      categoryId: newCategory.id,
      userId: currentUser.id 
    });

    return NextResponse.json(newCategory, { status: 201 });

  } catch (error) {
    logger.error('خطا در ایجاد دسته‌بندی', { error });
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'خطای سرور', message: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'خطای ناشناخته سرور' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // پارامترهای جستجو
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // محاسبه صفحات
    const skip = (page - 1) * limit;
    const where = search 
      ? { name: { contains: search, mode: 'insensitive' } } 
      : {};

    // دریافت دسته‌بندی‌ها
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { posts: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.category.count({ where })
    ]);

    return NextResponse.json({
      data: categories,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      }
    });

  } catch (error) {
    logger.error('خطا در دریافت دسته‌بندی‌ها', { error });
    return NextResponse.json(
      { error: 'خطا در دریافت داده‌ها' },
      { status: 500 }
    );
  }
}
