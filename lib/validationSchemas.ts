import { z } from 'zod';
import { prisma } from './db';

// اعتبارسنجی پیشرفته برای slug
const slugSchema = z.string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9-]+$/, {
    message: 'Slug باید فقط شامل حروف کوچک، اعداد و خط تیره باشد'
  });

// اعتبارسنجی مشترک برای متادیتای سئو
const seoMetadataSchema = z.object({
  metaTitle: z.string().min(10).max(100).optional(),
  metaDescription: z.string().min(30).max(160).optional(),
  metaKeywords: z.string().max(200).optional(),
  canonicalUrl: z.string().url().optional(),
  noIndex: z.boolean().optional(),
  openGraphImage: z.string().url().optional()
});

// --- اسکیمای دسته‌بندی ---
export const categorySchema = z.object({
  name: z.string()
    .min(2, 'نام دسته‌بندی باید حداقل ۲ کاراکتر باشد')
    .max(50, 'نام دسته‌بندی نمی‌تواند بیش از ۵۰ کاراکتر باشد'),
  slug: slugSchema
    .refine(async (slug) => {
      const exists = await prisma.category.findUnique({ where: { slug } });
      return !exists;
    }, 'این slug قبلا استفاده شده است')
});

// اسکیمای آپدیت دسته‌بندی
export const categoryUpdateSchema = categorySchema.partial();

// --- اسکیمای پست ---
export const postSchema = z.object({
  title: z.string()
    .min(10, 'عنوان باید حداقل ۱۰ کاراکتر باشد')
    .max(100, 'عنوان نمی‌تواند بیش از ۱۰۰ کاراکتر باشد'),
  slug: slugSchema
    .refine(async (slug) => {
      const exists = await prisma.post.findUnique({ where: { slug } });
      return !exists;
    }, 'این slug قبلا استفاده شده است'),
  content: z.string()
    .min(100, 'محتوای پست باید حداقل ۱۰۰ کاراکتر باشد'),
  categoryId: z.string()
    .refine(async (id) => {
      const exists = await prisma.category.findUnique({ where: { id } });
      return !!exists;
    }, 'دسته‌بندی انتخاب شده معتبر نیست'),
  seo: seoMetadataSchema.optional()
});

// اسکیمای آپدیت پست
export const postUpdateSchema = postSchema.partial();

// --- اسکیمای سئو ---
export const seoSchema = z.object({
  entityType: z.enum(['POST', 'CATEGORY', 'PAGE']),
  entityId: z.string(),
  data: seoMetadataSchema
});

// --- اسکیمای تنظیمات جهانی سئو ---
export const globalSeoSchema = z.object({
  siteName: z.string().min(2).max(50),
  defaultTitle: z.string().min(10).max(100),
  defaultDescription: z.string().min(30).max(160),
  defaultKeywords: z.string().max(200).optional(),
  logo: z.string().url().optional(),
  twitterHandle: z.string().regex(/^@?(\w){1,15}$/, 'شناسه توییتر معتبر نیست').optional(),
  facebookAppId: z.string().regex(/^\d+$/, 'آیدی فیسبوک باید عددی باشد').optional(),
  defaultSocialImage: z.string().url().optional(),
  robotsTxt: z.string().max(1000).optional()
});

// --- اسکیمای صفحه ---
export const pageSchema = z.object({
  title: z.string().min(10).max(100),
  slug: slugSchema
    .refine(async (slug) => {
      const exists = await prisma.page.findUnique({ where: { slug } });
      return !exists;
    }, 'این slug قبلا استفاده شده است'),
  content: z.string().min(100),
  seo: seoMetadataSchema.extend({
    schemaType: z.string().optional()
  }).optional()
});

// اسکیمای آپدیت صفحه
export const pageUpdateSchema = pageSchema.partial();

// --- اسکیمای تحلیل سئو ---
export const seoAnalysisSchema = z.object({
  content: z.string().min(50),
  title: z.string().min(10).max(100).optional(),
  keywords: z.string().optional()
});

// --- تایپ‌های استخراج شده ---
export type CategoryInput = z.infer<typeof categorySchema>;
export type PostInput = z.infer<typeof postSchema>;
export type SEOInput = z.infer<typeof seoSchema>;
export type GlobalSEOInput = z.infer<typeof globalSeoSchema>;
export type PageInput = z.infer<typeof pageSchema>;
export type SEOAnalysisInput = z.infer<typeof seoAnalysisSchema>;
