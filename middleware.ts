import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const IS_MAINTENANCE_MODE = process.env.NEXT_PUBLIC_VOTES_UNAVAILABLE === 'true'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Serve index.html for root path
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/index.html'
    return NextResponse.rewrite(url)
  }

  if (!IS_MAINTENANCE_MODE) {
    return NextResponse.next()
  }

  // Allow essential assets, API routes, and maintenance page itself
  const allowedPrefixes = ['/_next', '/api', '/static', '/images', '/favicon', '/maintenance', '/manifest', '/icons', '/robots.txt', '/index.html']
  const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (isAllowed) {
    return NextResponse.next()
  }

  // Redirect all other routes to the maintenance page
  const maintenanceUrl = request.nextUrl.clone()
  maintenanceUrl.pathname = '/maintenance'
  return NextResponse.rewrite(maintenanceUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}


