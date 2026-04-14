import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../lib/db.js";

async function main(): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const sqlDir = path.resolve(__dirname, "../../sql");
  const files = (await readdir(sqlDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sqlPath = path.resolve(sqlDir, file);
    const sql = await readFile(sqlPath, "utf8");
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  console.log("Database schema initialized successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to initialize database schema:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
