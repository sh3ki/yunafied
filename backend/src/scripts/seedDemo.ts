import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../lib/db.js";

const demoUsers = [
  { email: "admin@yuna.edu", fullName: "System Admin", role: "admin", status: "active" },
  { email: "teacher@yuna.edu", fullName: "YUNA Teacher", role: "teacher", status: "active" },
  { email: "student@yuna.edu", fullName: "YUNA Student", role: "student", status: "active" },
] as const;

async function main(): Promise<void> {
  const hashed = await bcrypt.hash("password", 10);

  for (const user of demoUsers) {
    await pool.query(
      `INSERT INTO users (email, full_name, role, status, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             status = EXCLUDED.status,
             password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash),
             updated_at = NOW()`,
      [user.email, user.fullName, user.role, user.status, hashed],
    );
  }

  console.log("Demo accounts seeded (password = password).");
}

main()
  .catch((error) => {
    console.error("Failed to seed demo accounts:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
