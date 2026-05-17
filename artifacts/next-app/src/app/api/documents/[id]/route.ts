import { NextRequest, NextResponse } from 'next/server'

const LAMBDA = (process.env.API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.API_KEY ?? ''

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const res = await fetch(`${LAMBDA}/documents/${id}`, {
    method: 'DELETE',
    headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
  })
  if (res.status === 204) return new NextResponse(null, { status: 204 })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
