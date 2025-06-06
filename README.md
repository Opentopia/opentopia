# opentopia

⚔️ https://opentopia.org

- react router
- cloudflare workers / workers do

## running locally

1. `pnpm i`
2. `pnpm run dev`

The dev server runs with nodemon and unfortunately doesn't have HMR / fast refresh. That's a bummer. The reason behind it is that we had a LOT of trouble making cloudflare workers play well with react-router with SPA mode.

## deploying

Just commit + push.
