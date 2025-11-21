/**
 * Geolocation service for IP address tracking
 * Detects location and VPN/Proxy/Tor usage
 */

export interface GeolocationData {
  country: string | null
  region: string | null
  city: string | null
  lat: number | null
  lng: number | null
  isVpn: boolean
  isProxy: boolean
  isTor: boolean
  timezone: string | null
}

/**
 * Get geolocation data from IP address
 * Uses ipapi.co (free tier) or similar service
 */
export async function getGeolocationFromIP(ipAddress: string): Promise<GeolocationData> {
  try {
    // Remove port if present
    const cleanIP = ipAddress.split(':')[0]
    
    // Skip localhost/private IPs
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
      return {
        country: null,
        region: null,
        city: null,
        lat: null,
        lng: null,
        isVpn: false,
        isProxy: false,
        isTor: false,
        timezone: null,
      }
    }
    
    // Use ipapi.co (free tier: 1000 requests/day)
    // Alternative: ip-api.com, ipgeolocation.io, maxmind GeoIP2
    const response = await fetch(`https://ipapi.co/${cleanIP}/json/`, {
      headers: {
        'User-Agent': 'Prelyct-Votes/1.0',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Geolocation API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Check for VPN/Proxy indicators
    // Note: ipapi.co doesn't provide VPN detection in free tier
    // For production, consider: ipqualityscore.com, ip2location.com, maxmind
    const isVpn = data.org?.toLowerCase().includes('vpn') || 
                  data.org?.toLowerCase().includes('proxy') ||
                  false
    
    const isProxy = data.org?.toLowerCase().includes('proxy') || false
    
    // Check Tor (would need specialized service)
    const isTor = false // Implement Tor detection if needed
    
    return {
      country: data.country_name || null,
      region: data.region || null,
      city: data.city || null,
      lat: data.latitude || null,
      lng: data.longitude || null,
      isVpn,
      isProxy,
      isTor,
      timezone: data.timezone || null,
    }
  } catch (error) {
    console.error('Geolocation error:', error)
    // Return default values on error
    return {
      country: null,
      region: null,
      city: null,
      lat: null,
      lng: null,
      isVpn: false,
      isProxy: false,
      isTor: false,
      timezone: null,
    }
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request | { headers: Headers | { get: (key: string) => string | null } }): string {
  const headers = 'headers' in request ? request.headers : request
  
  // Check various headers for real IP (behind proxy/load balancer)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip') // Cloudflare
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback (won't work in serverless, but good for development)
  return 'unknown'
}

/**
 * Check if IP address is suspicious based on patterns
 */
export function isSuspiciousIP(ipAddress: string, voteCount: number, isVpn: boolean, isProxy: boolean, isTor: boolean): boolean {
  // Multiple votes from same IP
  if (voteCount > 5) {
    return true
  }
  
  // VPN/Proxy/Tor usage
  if (isVpn || isProxy || isTor) {
    return true
  }
  
  // Add more heuristics as needed
  return false
}


