import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'

const adminRoutes = ['/admin', '/admin/(.*)']

export async function middleware(request: NextRequest) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  if (adminRoutes.some(route => new RegExp(route).test(request.nextUrl.pathname))) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  return NextResponse.next()
}
  // امنیت پایه
  const response = NextResponse.next()
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  return response
}
