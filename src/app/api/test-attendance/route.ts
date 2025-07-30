import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log('🟢 TEST ATTENDANCE API HIT')
  
  try {
    const body = await request.json()
    console.log('🟢 Test API body:', body)
    
    return NextResponse.json({
      success: true,
      message: "Test API working",
      receivedData: body
    })
  } catch (error) {
    console.log('🟢 Test API error:', error)
    return NextResponse.json({
      success: false,
      error: "Test API failed"
    }, { status: 500 })
  }
}