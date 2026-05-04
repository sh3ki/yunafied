import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/lib/db.js';

const sql = readFileSync(join(import.meta.dirname, '../sql/013_email_verification.sql'), 'utf8');

pool.query(sql)
  .then(() => {
    console.log('Migration 013 applied successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
