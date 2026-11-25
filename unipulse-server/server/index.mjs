// Serverul UniPulse pentru ianovici.dev: doar API-ul /api/unipulse/*.
// Paginile aplicatiei sunt servite static de site (public/unipulse/), iar Vercel
// trimite cererile /api/unipulse/* aici (vezi vercel.json din radacina repo-ului).
export { UniPulseHub } from './unipulse-hub.mjs';
import { unipulse } from './unipulse-routes.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/unipulse/')) return unipulse(request, env, url);
    return new Response('Not found', { status: 404 });
  }
};
