import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!)
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getAdminClient()

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('users')
        .update({ stripe_subscription_status: subscription.status })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('users')
        .update({ stripe_subscription_status: 'canceled' })
        .eq('stripe_customer_id', customerId)
      break
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.customer_email) {
        await supabase
          .from('users')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_status: 'active',
          })
          .eq('email', session.customer_email)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
