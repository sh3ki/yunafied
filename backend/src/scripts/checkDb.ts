import "dotenv/config";
import { pool } from "../lib/db.js";

async function main(): Promise<void> {
  const result = await pool.query("SELECT NOW() AS now, current_database() AS db");
  console.log("Connected to database:", result.rows[0]);
}

main()
  .catch((error) => {
    console.error("Database connection check failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
