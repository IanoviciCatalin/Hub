// Rularea unei surse, folosită de Workerul programat (ingest/index.mjs) și de butonul „Rulează acum” din admin.
// hub = stub-ul Durable Object-ului UniPulse (sau UniPulseStore în teste); metodele întorc { ok } / { error }.
import { SOURCES, SourceError, fetchSource, prepare, sourceById } from './pipeline.mjs';

export const sourceDefs = () => SOURCES.map(({ id, name, url, terms }) => ({ id, name, url, terms }));

const unwrap = (result) => {
  if (result?.error) throw new SourceError(result.error, '', { temporary: false });
  return result.ok;
};

// O sursă care eșuează nu oprește celelalte: fiecare rulare își prinde propriile erori.
export async function runSource(hub, sourceId, { job = 'discover', dryRun = false, force = false, now = Date.now(), fetchImpl, wait, geocode, userAgent } = {}) {
  const source = sourceById(sourceId);
  if (!source) return { sourceId, status: 'unknown_source' };
  const state = unwrap(await hub.importSource(sourceId, sourceDefs()));
  if (!state.enabled && !force && !dryRun) return { sourceId, status: 'disabled' };
  let items;
  try {
    const text = await fetchSource(source, { fetchImpl, wait, userAgent });
    const raws = source.parse(text);
    items = [];
    for (const raw of raws) items.push(await prepare(raw, source, { now, geocode }));
  } catch (error) {
    const failure = { code: error instanceof SourceError ? error.message : 'PARSE_ERROR', detail: error?.detail || error?.message || '' };
    unwrap(await hub.importFailure(sourceId, job, failure, { dryRun, now }));
    return { sourceId, status: 'error', error: failure.code };
  }
  const result = unwrap(await hub.importCommit(sourceId, items, { job, dryRun, fullFeed: !!source.fullFeed, now, startedAt: now }));
  return { sourceId, status: 'ok', dryRun, ...result };
}

export async function runAll(hub, options = {}) {
  const results = [];
  for (const source of SOURCES) {
    try { results.push(await runSource(hub, source.id, options)); }
    catch (error) { results.push({ sourceId: source.id, status: 'error', error: String(error?.message || error).slice(0, 80) }); }
  }
  return results;
}
