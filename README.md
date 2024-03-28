OAuth Proxy Experiment
----------------------

Wraps existing OAuth Providers for the purpose of adding a payment step during sign-up.

## How it works

When the user signs in, they are silently redirected to the upstream OAuth server (Google, Apple, etc..). After signing in, they are sent into a Stripe Checkout to pay for a subscription. And then redirected back to the original app.

This server also provides an access token containing their Stripe `customer_id`, `subscription_id`, `payment_status` & `plan`.

## Why?

All languages and frameworks already support OAuth. With this proxy, people building a SaaS wouldn't need to build a custom payment integration. This proxy can wrap any OAuth compliant server and add a payment flow.

## Sequence Diagram

![Sequence diagram](sequence-diagram.png)

