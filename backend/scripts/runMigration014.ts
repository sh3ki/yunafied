import { pool } from "../src/lib/db.js";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration014() {
  const sqlPath = join(import.meta.dirname, "../sql/014_split_full_name.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Migration 014 complete: full_name split into first_name, middle_name, last_name");
  await pool.end();
}

runMigration014().catch((err) => {
  console.error("Migration 014 failed:", err);
  process.exit(1);
});
