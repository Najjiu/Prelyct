import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const IS_MAINTENANCE_MODE = process.env.NEXT_PUBLIC_VOTES_UNAVAILABLE === 'true'

export function middleware(request: NextRequest) {
  if (!IS_MAINTENANCE_MODE) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Allow essential assets, API routes, and maintenance page itself
  const allowedPrefixes = ['/_next', '/api', '/static', '/images', '/favicon', '/maintenance', '/manifest', '/icons', '/robots.txt']
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


