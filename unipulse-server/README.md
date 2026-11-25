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

## Import automat de evenimente

Evenimentele din surse oficiale intră într-un catalog separat (`server/unipulse-catalog.mjs`,
tabele noi în Durable Object). Importul nu atinge participările, discuțiile sau echipele.

- `server/ingest/` – pipeline comun: iCal, normalizare (fus Europe/Bucharest), locații, clasificare,
  validare, duplicate (`dedup.mjs`). Un conector nou = un fișier în `server/ingest/connectors/` + o
  intrare în `SOURCES` (`pipeline.mjs`).
- Sursa pilot: Teatrul Național Timișoara (`https://www.tntm.ro/?ical=1`).
- `GET /api/unipulse/catalog?city=` – evenimentele publicate; frontendul le arată cu
  „Pagina oficială a evenimentului”.
- Admin → fila „Import automat”: surse, verificare înainte de publicare, rulări, istoric.
- Evenimentele încheiate ies singure din catalog; după 6 ore sunt arhivate, iar după 30 de zile
  se șterg definitiv doar dacă nimeni nu a participat, scris sau făcut echipă.
- Worker separat `unipulse-ingest` (`wrangler.ingest.jsonc`, `ingest/index.mjs`) pentru rulările
  programate. Este oprit: `INGEST_ENABLED=false` și fără cron. Pornirea se face doar după aprobare:

      npx wrangler deploy                      # API-ul (tabelele noi se creează singure)
      # în wrangler.ingest.jsonc: INGEST_ENABLED "true" și crons ["0 */6 * * *", "30 2 * * *"]
      npm run deploy:ingest

Teste: `npm test` (date demonstrative în `tests/fixtures/tntm.ics`, fără rețea).
