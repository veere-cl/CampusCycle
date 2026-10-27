# Campus Cycle

A campus bicycle rental website built with JavaScript, AngularJS, and Node.js. The current `npm start` mode is a local demonstration: it saves bikes and reservations to a JSON file on this computer.

## Run locally

1. Install Node.js.
2. Open this folder in VS Code.
3. In the VS Code terminal, run `npm start`.
4. Visit `http://localhost:4200`.

The app has no npm dependencies. It loads AngularJS and fonts from public CDNs, so an internet connection is needed for those assets. The Node server creates `data/store.json` if it does not exist. Inventory and reservations are saved there and remain after a restart.

## Get a live demo link

Click the button to create a free Render web service from this repository:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/veere-cl/CampusCycle)

Sign in to Render, review the service settings, and approve the deployment. Render provides the public `onrender.com` link when the first deploy finishes. The free service can sleep after 15 minutes without visits, so its first page load may take a little longer. This demo stores rentals in a local JSON file; free hosting does not preserve that file across restarts or redeployments. Use a production database before relying on rental data.

## API

- `GET /api/bikes` — list campus bikes and availability
- `GET /api/bookings` — list saved rentals
- `POST /api/bookings` — reserve an available bike
- `POST /api/bookings/:id/cancel` — cancel a reservation and release its bike

## Preparing the full rental service

The `supabase/schema.sql` file defines the production database tables and account-specific rental access. `.env.example` lists the service settings. The existing local demo does not yet use these services. Real student accounts, paid reservations, and public hosting require provider setup and application integration before launch.

Suggested setup uses Supabase for verified accounts and Postgres, and Stripe Checkout for hosted card payments. Supabase's official docs describe its email/password, one-time code, and single sign-on options; Stripe Checkout keeps card entry on Stripe's hosted page. See [Supabase Auth](https://supabase.com/docs/guides/auth) and [Stripe Checkout](https://docs.stripe.com/payments/checkout).

### Required before launch

1. Confirm the college's official student email domain or campus single sign-on provider.
2. Create a Supabase project, review and apply `supabase/schema.sql`, add the campus domain to the allowed signup configuration, and enable email verification.
3. Create a Stripe account and configure hosted Checkout plus a payment webhook. Begin in test mode.
4. Copy `.env.example` to `.env` and fill the values on your own computer. Never paste secret keys into chat, browser code, or a public repository.
5. Integrate and verify the app's account, rental, payment, cancellation/refund, and webhook flows; then deploy with HTTPS and add the deployed address to provider settings.

The production foundation is not activated by `npm start`; that command continues to launch the local demo. Do not accept real customer payments until the service routes, verified student access, webhook handling, operating policies, and deployed HTTPS site are configured.
