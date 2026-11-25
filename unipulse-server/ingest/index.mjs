// Worker-ul de import automat (unipulse-ingest). Rulează doar din Cron Triggers și scrie
// în același Durable Object ca API-ul (binding cu script_name: unipulse-api).
// Siguranțe: INGEST_ENABLED trebuie să fie "true", iar fiecare sursă are propriul comutator în admin.
import { runAll } from '../server/ingest/runner.mjs';

// Programul propus (se activează în wrangler.ingest.jsonc doar după aprobarea pentru producție):
//   "0 */6 * * *"  descoperire + actualizare pentru toate sursele active
//   "30 2 * * *"   întreținere: arhivarea evenimentelor încheiate și curățarea arhivei vechi
export const JOBS = { '0 */6 * * *': 'discover', '30 2 * * *': 'maintenance' };

export async function scheduledJob(cron, env) {
  if (env.INGEST_ENABLED !== 'true') return { skipped: 'INGEST_DISABLED' };
  const hub = env.UNIPULSE_HUB.getByName('main');
  const job = JOBS[cron] || 'discover';
  if (job === 'maintenance') return { job, result: await hub.importMaintenance() };
  const results = await runAll(hub, { job, userAgent: env.INGEST_USER_AGENT });
  // Arhivarea rulează și după fiecare descoperire, ca evenimentele încheiate să dispară repede.
  const maintenance = await hub.importMaintenance();
  return { job, results, maintenance };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scheduledJob(controller.cron, env).then((outcome) => {
      console.log(JSON.stringify({ event: 'unipulse_ingest', cron: controller.cron, outcome }));
    }, (error) => {
      console.error(JSON.stringify({ event: 'unipulse_ingest_error', message: String(error?.message || error).slice(0, 160) }));
    }));
  },
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
};
