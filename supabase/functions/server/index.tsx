import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-9d3660f9/health", (c) => {
  return c.json({ status: "ok" });
});

// Generic Data Getter
app.get("/make-server-9d3660f9/data/:key", async (c) => {
  const key = c.req.param("key");
  // Prefix keys to avoid collision with other apps sharing this KV
  const value = await kv.get(`yuna_${key}`);
  return c.json(value || []);
});

// Generic Data Setter (Overwrite)
app.post("/make-server-9d3660f9/data/:key", async (c) => {
  const key = c.req.param("key");
  const data = await c.req.json();
  await kv.set(`yuna_${key}`, data);
  return c.json({ success: true });
});

// Signup Route
app.post("/make-server-9d3660f9/signup", async (c) => {
  try {
    const { email, password, ...meta } = await c.req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: meta,
      email_confirm: true
    });

    if (error) {
      // Ignore if user already exists
      const isExistingUser = 
        error.code === 'email_exists' || 
        error.status === 422 || 
        (error.message && error.message.includes('already been registered'));
        
      if (isExistingUser) {
        console.log(`User ${email} already exists. Skipping creation.`);
      } else {
        console.error("Signup error details:", JSON.stringify(error));
        return c.json({ error: error.message }, 400);
      }
    }
    
    // Also add to KV store for app logic consistency
    const currentUsers: any[] = (await kv.get('yuna_users')) || [];
    // Check if exists in KV
    if (!currentUsers.find((u: any) => u.email === email)) {
        const newUser = { 
            id: data?.user?.id || Math.random().toString(36), 
            email, 
            name: meta.name || email.split('@')[0], 
            role: meta.role || 'student',
            password: '***' // Don't store actual password in KV
        };
        await kv.set('yuna_users', [...currentUsers, newUser]);
    }

    return c.json(data || { success: true });
  } catch (e) {
    console.error("Server signup error:", e);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Seeding endpoint to reset/init data
app.post("/make-server-9d3660f9/seed", async (c) => {
  const initialUsers = [
    { id: 'admin1', email: 'admin@yuna.edu', name: 'Admin User', role: 'admin' },
    { id: 'teacher1', email: 'teacher@yuna.edu', name: 'Ms. Yuna', role: 'teacher' },
    { id: 'student1', email: 'student@yuna.edu', name: 'John Doe', role: 'student' },
  ];
  const initialSchedules = [
    { id: 'sch1', title: 'English 101', day: 'Monday', startTime: '09:00', endTime: '10:30', teacherId: 'teacher1' },
    { id: 'sch2', title: 'Advanced Grammar', day: 'Wednesday', startTime: '11:00', endTime: '12:30', teacherId: 'teacher1' },
  ];
  const initialAssignments = [
    { id: 'asg1', title: 'Essay on Shakespeare', description: 'Write 500 words.', dueDate: '2023-12-01', teacherId: 'teacher1' }
  ];
  
  await kv.set('yuna_users', initialUsers);
  await kv.set('yuna_schedules', initialSchedules);
  await kv.set('yuna_assignments', initialAssignments);
  await kv.set('yuna_submissions', []);

  // Also create Auth Users for Demo
  const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  
  const demoUsers = [
      { email: 'admin@yuna.edu', password: 'password', role: 'admin' },
      { email: 'teacher@yuna.edu', password: 'password', role: 'teacher' },
      { email: 'student@yuna.edu', password: 'password', role: 'student' }
  ];

  for (const u of demoUsers) {
      const { error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          user_metadata: { role: u.role },
          email_confirm: true
      });
      // Ignore "already registered" errors for seeding
      if (error && error.code !== 'email_exists' && !error.message?.includes('already been registered')) {
          console.error(`Seed error for ${u.email}:`, error);
      }
  }

  return c.json({ success: true, message: "Seeded" });
});

Deno.serve(app.fetch);
