import { pool } from "../lib/db.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration014() {
  const sqlPath = path.resolve(__dirname, "../../sql/014_split_full_name.sql");
  const sql = await fs.readFile(sqlPath, "utf8");
  await pool.query(sql);
  console.log("Migration 014 complete: full_name split into first_name, middle_name, last_name");
  await pool.end();
}

runMigration014().catch((err) => {
  console.error("Migration 014 failed:", err);
  process.exit(1);
});
