import { NextRequest, NextResponse } from 'next/server'

const LAMBDA = (process.env.API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.API_KEY ?? ''

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${LAMBDA}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
