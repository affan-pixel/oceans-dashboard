// HTTP Basic Auth gate for the whole dashboard (Next 16 "proxy" convention).
//
// WHY THIS EXISTS: every API route serves candidate data — name, email, phone,
// LinkedIn — with no authentication of its own. The moment a real Diver profile
// goes into the database, an open deployment is publishing that person's contact
// details to anyone with the URL. This is the single gate in front of all of it.
//
// It FAILS CLOSED. If APP_PASSWORD is unset the app returns 503 for everything
// rather than defaulting to open, because a silent default-open here is exactly
// the failure that leaks PII.
//
// Not a real identity system: one shared credential, no users, no sessions, no
// audit trail. It is the honest minimum for an internal tool on a public URL.
// Swap for per-user auth before anyone outside the Oceans team gets a login.

import { NextResponse, type NextRequest } from 'next/server'

const REALM = 'Oceans Dashboard'

// Length-independent comparison so a wrong password can't be recovered by
// timing the response. Compares hashes-of-equal-length, not raw strings.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  // Fold both into a fixed-size accumulator so differing lengths cost the same.
  let diff = ab.length ^ bb.length
  const max = Math.max(ab.length, bb.length)
  for (let i = 0; i < max; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

function unauthorized() {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      // Prompts the browser's native login dialog.
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  })
}

export function proxy(request: NextRequest) {
  const expectedPassword = process.env.APP_PASSWORD ?? ''
  const expectedUser = process.env.APP_USER || 'oceans'

  if (!expectedPassword) {
    return new NextResponse(
      'This deployment is not configured: APP_PASSWORD is unset.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Basic ')) return unauthorized()

  let decoded = ''
  try {
    decoded = atob(header.slice(6).trim())
  } catch {
    return unauthorized()
  }

  // Only split on the FIRST colon — passwords may contain colons.
  const sep = decoded.indexOf(':')
  if (sep === -1) return unauthorized()
  const user = decoded.slice(0, sep)
  const password = decoded.slice(sep + 1)

  // Evaluate both comparisons unconditionally — no early return that would
  // reveal whether the username alone was correct.
  const userOk = safeEqual(user, expectedUser)
  const passOk = safeEqual(password, expectedPassword)
  if (!(userOk && passOk)) return unauthorized()

  return NextResponse.next()
}

export const config = {
  // Guard everything except:
  //   - /api/cron/*  — authenticated by its own CRON_SECRET bearer token, and
  //                    the scheduler cannot send Basic credentials.
  //   - Next.js build assets, the favicon, and robots.txt.
  matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)'],
}
