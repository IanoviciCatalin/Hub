import { DurableObject } from 'cloudflare:workers';
import { UniPulseStore, STORE_METHODS } from './unipulse-store.mjs';

// O singură instanță („main”) păstrează datele UniPulse în SQLite-ul Durable Object-ului.
// Logica stă în UniPulseStore (testabilă în Node); aici o expunem prin RPC.
export class UniPulseHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new UniPulseStore(ctx.storage.sql, { transaction: (fn) => ctx.storage.transactionSync(fn) });
  }
}
for (const name of STORE_METHODS) {
  UniPulseHub.prototype[name] = function (...args) { return this.store[name](...args); };
}
