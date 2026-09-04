import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ its_no: string }> },
) {
  return NextResponse.json(
    { error: 'This endpoint has been retired. Use POST /api/address/move instead.' },
    { status: 410 },
  )
}
