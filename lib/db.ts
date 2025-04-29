import { PrismaClient } from '@prisma/client'

// تعریف یک نمونه Prisma Client با ویژگی‌های پیشرفته
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'query', emit: 'event' }
    ]
  })
}

// تعریف نوع Prisma Client
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

// مدیریت نمونه Prisma در محیط توسعه و تولید
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

// ایجاد یا استفاده از نمونه موجود Prisma
const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// جلوگیری از ایجاد نمونه‌های متعدد در محیط توسعه
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// مدیریت خطاهای Query
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query)
  console.log('Duration: ' + e.duration + 'ms')
})

// مدیریت خطاهای هشدار
prisma.$on('warn', (e) => {
  console.warn('Prisma Warning: ' + e.message)
})

// مدیریت خطاهای بحرانی
prisma.$on('error', (e) => {
  console.error('Prisma Error: ' + e.message)
})

// افزودن هوک‌های سفارشی برای مدل‌ها
prisma.$use(async (params, next) => {
  // لاگ تمام عملیات
  console.log(`Prisma Operation: ${params.model}.${params.action}`)
  
  // اعتبارسنجی قبل از ایجاد یا آپدیت
  if (['create', 'update'].includes(params.action)) {
    if (params.model === 'Post') {
      // اعتبارسنجی اضافی برای پست‌ها
      if (!params.args.data.title || params.args.data.title.length < 2) {
        throw new Error('عنوان پست باید حداقل ۲ کاراکتر باشد')
      }
    }
  }
  
  return next(params)
})

// اتصال به پایگاه داده هنگام راه‌اندازی
async function connectDB() {
  try {
    await prisma.$connect()
    console.log('اتصال به پایگاه داده با موفقیت برقرار شد')
  } catch (error) {
    console.error('خطا در اتصال به پایگاه داده:', error)
    process.exit(1)
  }
}

// قطع اتصال هنگام خاتمه برنامه
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export { prisma, connectDB }
