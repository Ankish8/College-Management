import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Wrong endpoint. Use /api/batches instead of /batches",
      redirect: "/api/batches"
    }, 
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Wrong endpoint. Use /api/batches instead of /batches",
      redirect: "/api/batches"
    }, 
    { status: 404 }
  )
}