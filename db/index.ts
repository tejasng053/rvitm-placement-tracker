import { env } from 'cloudflare:workers';
export function getDatabase() {
  if (!env.DB) throw new Error('Placement database is unavailable.');
  return env.DB;
}
