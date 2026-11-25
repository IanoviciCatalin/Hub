// Serverul UniPulse pentru ianovici.dev: doar API-ul /api/unipulse/*.
// Paginile aplicatiei sunt servite static de site (public/unipulse/), iar Vercel
// trimite cererile /api/unipulse/* aici (vezi rewrites din next.config.ts).
export { UniPulseHub } from './unipulse-hub.mjs';
import { unipulse } from './unipulse-routes.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // site-ul foloseste trailingSlash, deci /counts poate ajunge ca /counts/
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.replace(/\/+$/, '');
    if (url.pathname.startsWith('/api/unipulse/')) return unipulse(request, env, url);
    return new Response('Not found', { status: 404 });
  }
};
