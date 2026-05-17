import { NextRequest, NextResponse } from 'next/server'

const LAMBDA = (process.env.API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.API_KEY ?? ''

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const res = await fetch(`${LAMBDA}/upload`, {
    method: 'POST',
    headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
