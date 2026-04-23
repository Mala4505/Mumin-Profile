import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/getSession'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ progress: null })
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true })
}

