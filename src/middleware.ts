import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle 404s for direct page requests that should be API calls
  const pathname = request.nextUrl.pathname
  
  // If someone tries to access /batches, /students, etc. directly as API
  // but they're missing /api prefix, return 404 immediately
  if (pathname.match(/^\/(batches|students|subjects|faculty)$/) && 
      !pathname.startsWith('/api/')) {
    // Check if this is an API request (has Accept: application/json)
    const isApiRequest = request.headers.get('accept')?.includes('application/json')
    
    if (isApiRequest) {
      return new NextResponse(
        JSON.stringify({ error: 'Not Found - Use /api' + pathname }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}