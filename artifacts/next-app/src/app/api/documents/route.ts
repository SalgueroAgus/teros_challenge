import { NextRequest, NextResponse } from 'next/server'

const LAMBDA = (process.env.API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.API_KEY ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const qs = searchParams.toString()
  const res = await fetch(`${LAMBDA}/documents${qs ? `?${qs}` : ''}`, {
    headers: API_KEY ? { 'X-API-Key': API_KEY } : {},
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
