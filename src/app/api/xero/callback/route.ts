import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/onboarding?error=${error}`, request.url))
  }

  if (!code || state !== 'xero_oauth') {
    return NextResponse.redirect(new URL('/onboarding?error=invalid_state', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.XERO_REDIRECT_URI!,
        client_id: process.env.XERO_CLIENT_ID!,
        client_secret: process.env.XERO_CLIENT_SECRET!,
      }),
    })

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text()
      console.error('Xero token exchange failed:', err)
      return NextResponse.redirect(new URL('/onboarding?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!connectionsResponse.ok) {
      return NextResponse.redirect(new URL('/onboarding?error=connections_failed', request.url))
    }

    const connections = await connectionsResponse.json()
    if (!connections.length) {
      return NextResponse.redirect(new URL('/onboarding?error=no_organisations', request.url))
    }

    const tenant = connections[0]
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('xero_connections')
      .upsert({
        user_id: user.id,
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Failed to save Xero connection:', dbError)
      return NextResponse.redirect(new URL('/onboarding?error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('Xero callback error:', err)
    return NextResponse.redirect(new URL('/onboarding?error=unknown', request.url))
  }
}
