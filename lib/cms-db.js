'use strict';

const { neon } = require('@neondatabase/serverless');

let sqlClient;
let schemaPromise;

function getSql() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('CMS database is not configured. Set DATABASE_URL in the Vercel project environment.');
    error.statusCode = 503;
    throw error;
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function ensureSchema(sql) {
  if (!schemaPromise) {
    schemaPromise = sql.query(
      "CREATE TABLE IF NOT EXISTS cms_state (" +
      "key text PRIMARY KEY CHECK (key IN ('draft','published')), " +
      "data jsonb NOT NULL, " +
      "updated_at timestamptz NOT NULL DEFAULT now()" +
      ")"
    ).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

async function readState(key) {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql.query(
    'SELECT data, updated_at FROM cms_state WHERE key = $1 LIMIT 1',
    [key]
  );
  return rows[0] || null;
}

async function writeStates(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('No CMS data was supplied.');
  }
  for (const item of items) {
    if (!item || !['draft', 'published'].includes(item.key) ||
        !item.data || typeof item.data !== 'object' || Array.isArray(item.data)) {
      throw new Error('The CMS payload is invalid.');
    }
  }

  const sql = getSql();
  await ensureSchema(sql);
  await sql.query(
    'INSERT INTO cms_state (key, data, updated_at) ' +
    "SELECT item->>'key', item->'data', now() " +
    'FROM jsonb_array_elements($1::jsonb) AS entries(item) ' +
    'ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()',
    [JSON.stringify(items)]
  );
}

function errorMessage(error) {
  if (error && error.statusCode === 503) return error.message;
  return 'CMS storage is unavailable. Check DATABASE_URL and the Neon database connection.';
}

module.exports = { readState, writeStates, errorMessage };
