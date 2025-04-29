import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public/uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const uniqueName = `${uuidv4()}${path.extname(file.name)}`
    const filePath = path.join(uploadDir, uniqueName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    return NextResponse.json({ 
      success: true,
      url: `/uploads/${uniqueName}`
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    )
  }
}
