import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ایجاد کاربر ادمین
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'مدیر سیستم',
      password: bcrypt.hashSync('password123', 10),
      role: 'ADMIN'
    }
  })

  // ایجاد دسته‌بندی پیش‌فرض
  await prisma.category.create({
    data: {
      name: 'عمومی',
      slug: 'general'
    }
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
