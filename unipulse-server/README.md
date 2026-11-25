# UniPulse API (Cloudflare Worker)

Backend pentru /unipulse/ (conturi, echipe, evenimente adaugate, numaratori, admin).
Ruleaza pe contul tau Cloudflare (planul gratuit ajunge). Site-ul de pe Vercel trimite
`/api/unipulse/*` catre worker prin `vercel.json`, deci totul ramane pe domeniul tau.

## Deploy (o singura data)

    cd unipulse-server
    npm ci
    npx wrangler login
    npx wrangler d1 create unipulse      # copiaza database_id in wrangler.jsonc
    npm run db:remote                    # creeaza tabelele
    npm run deploy                       # afiseaza https://unipulse-api.<cont>.workers.dev

Apoi pune URL-ul in `vercel.json` (rewrite `/api/unipulse/:path*`).

## Local

    npm run setup && npm run dev         # http://localhost:8787
    npm test
