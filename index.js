import 'dotenv/config'
import Stripe from 'stripe'
import Fastify from 'fastify'
import viewEngine from '@fastify/view'
import formBody from '@fastify/formbody'
import cookies from '@fastify/cookie'
import ejs from 'ejs'
import { nanoid } from 'nanoid'
import { isValidClient, isValidCallback } from './clients.js'

const fastify = Fastify({
  logger: true
})

fastify.register(viewEngine, {
  engine: {
    ejs
  },
})

fastify.register(cookies, {
  secret: "my-secret"
})

fastify.register(formBody)

const { DOMAIN, STRIPE_SECRET_KEY } = process.env
const stripe = new Stripe(STRIPE_SECRET_KEY)
const subscriptions = new Map()

fastify.get('/oauth/authorize', async (request, reply) => {
  const { response_type, client_id, redirect_uri, state } = request.query

  if (response_type !== 'code') {
    return reply.status(406).send({ error: 'Unexpected response_type'})
  }

  if (!isValidClient(client_id)) {
    return reply.status(401).send({ error: 'Invalid client_id'})
  }

  if (!state) {
    return reply.status(406).send({ error: 'Expected non-empty state'})
  }

  if (!isValidCallback(client_id, redirect_uri)) {
    return reply.status(401).send({ error: 'Invalid redirect_uri. Callback URLs must be configured.'})
  }

  return reply
    .setCookie('redirect_uri', redirect_uri, { path: '/' })
    .redirect('/login')
})

fastify.post('/oauth/access_token', async (request, reply) => {
  const { body} = request

  const grant_type = body.grant_type
  const client_id = body.client_id
  const redirect_uri = body.redirect_uri
  const code = body.code

  if (grant_type !== 'authorization_code') {
    return reply.status(406).send({ error: 'Unexpected grant_type'})
  }

  if (!isValidClient(client_id)) {
    return reply.status(401).send({ error: 'Invalid client_id'})
  }

  if (!code) {
    return reply.status(406).send({ error: 'Expected non-empty code'})
  }

  if (!isValidCallback(client_id, redirect_uri)) {
    return reply.status(401).send({ error: 'Invalid redirect_uri. Callback URLs must be configured.'})
  }

  const subscription = subscriptions.get(code)

  if (!subscription) {
    return reply.status(400).send({ error: 'Invalid request. Subscription not found.'})
  }

  const access_token = JSON.stringify({
    subscription: subscription.id,
    customer: subscription.customer,
    status: subscription.paymentStatus
  })

  return {
    access_token
  }
})

fastify.get('/login', ( request, reply ) => {
  return reply.view('/templates/login.ejs')
})

fastify.get('/fake/login', async ( request, reply ) => {
  const { redirect_uri, state } = request.cookies
  const metadata = {
    redirect_uri,
    state
  }

  const checkout = await stripe.checkout.sessions.create({
    success_url: `${DOMAIN}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: DOMAIN,
    mode: 'subscription',
    metadata,
    subscription_data: {
      metadata
    },
    line_items: [
      { 
        price: 'price_1Ou897CF5KwLeY0U88ldkBa1',
        quantity: 1
      }
    ]
  })

  return reply.redirect(checkout.url)
})

fastify.get('/checkout/complete', async ( request, reply ) => {
  const { redirect_uri, state } = request.cookies
  const { session_id } = request.query

  const checkout = await stripe.checkout.sessions.retrieve(session_id)
  const subscription = await stripe.subscriptions.retrieve(checkout.subscription)
  const code = nanoid()

  subscriptions.set(code, subscription)

  return reply.redirect(`${redirect_uri}?code=${code}`)
})

try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
