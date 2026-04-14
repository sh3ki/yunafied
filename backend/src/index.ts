import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import { z } from "zod";
import { testDatabaseConnection } from "./lib/db.js";
import { AuthenticatedRequest, requireAuth, requireRole, signAccessToken } from "./middleware/auth.js";
import { YunafiedService } from "./services/YunafiedService.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const service = new YunafiedService();
const BOOTSTRAP_CACHE_TTL_MS = 8000;
const bootstrapCache = new Map<string, { expiresAt: number; data: unknown }>();

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function bootstrapCacheKey(auth: { sub?: string; role?: string }): string {
  return `${auth.sub || "unknown"}:${auth.role || "unknown"}`;
}

function getBootstrapCache(key: string): unknown | null {
  const found = bootstrapCache.get(key);
  if (!found) {
    return null;
  }

  if (Date.now() > found.expiresAt) {
    bootstrapCache.delete(key);
    return null;
  }

  return found.data;
}

function setBootstrapCache(key: string, data: unknown): void {
  bootstrapCache.set(key, {
    expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS,
    data,
  });
}

function clearBootstrapCache(): void {
  bootstrapCache.clear();
}

async function requestGroqChat(input: {
  messages: GroqMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    throw new Error("Missing GROQ_API_KEY configuration.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 220,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const answer = json.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    throw new Error("YUNA AI returned an empty response.");
  }

  return answer;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads");
mkdirSync(uploadsDir, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) =>
    cb(null, uploadsDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}_${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".txt"];
    if (!allowed.includes(ext)) {
      cb(new Error("Only PDF, DOC, DOCX, and TXT files are allowed."));
      return;
    }
    cb(null, true);
  },
});

const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowed.includes(ext)) {
      cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
      return;
    }
    cb(null, true);
  },
});

async function uploadProfileBufferToCloudinary(file: Express.Multer.File): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "yunafied/profiles",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed."));
          return;
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    stream.end(file.buffer);
  });
}

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const aiChatSchema = z.object({
  message: z.string().min(1).max(1000),
  currentView: z.string().min(1).max(100),
  role: z.enum(["admin", "teacher", "student"]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200),
      }),
    )
    .max(8)
    .default([]),
});

const studyGuideSchema = z.object({
  message: z.string().min(1).max(1200),
  subject: z.string().max(80).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1200),
      }),
    )
    .max(10)
    .default([]),
});

const translateSchema = z.object({
  text: z.string().min(1).max(2000),
  sourceLanguage: z.string().min(2).max(40).default("English"),
  targetLanguage: z.string().min(2).max(40).default("Korean"),
});

const translationHistoryQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(6),
});

const updateProfileSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    profileImageUrl: z.string().url().nullable().optional(),
    profileImagePublicId: z.string().nullable().optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(6).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword && !value.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to set a new password.",
        path: ["currentPassword"],
      });
    }
  });

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "yunafied-backend" });
});

app.get("/api/health/db", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await testDatabaseConnection();
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = signupSchema.parse(req.body);
    const exists = await service.findUserWithPasswordByEmail(payload.email);
    if (exists) {
      res.status(409).json({ message: "Email is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await service.createUser({
      email: payload.email,
      fullName: payload.fullName,
      role: "student",
      status: "active",
      profileImageUrl: null,
      profileImagePublicId: null,
      passwordHash,
    });

    const token = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await service.findUserWithPasswordByEmail(payload.email);

    if (!user || !user.password_hash) {
      res.status(401).json({ message: "Invalid login credentials." });
      return;
    }

    const isValid = await bcrypt.compare(payload.password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ message: "Invalid login credentials." });
      return;
    }

    if (user.status === "inactive") {
      res.status(403).json({ message: "Your account is inactive. Please contact the administrator." });
      return;
    }

    const sanitized = service.toAuthUser(user);
    const token = signAccessToken({ sub: sanitized.id, email: sanitized.email, role: sanitized.role });
    res.json({ token, user: sanitized });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const email = req.auth?.email || "";
    const user = await service.findUserWithPasswordByEmail(email);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({ user: service.toAuthUser(user) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/profile", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = updateProfileSchema.parse(req.body);
    const currentUser = await service.findUserWithPasswordById(userId);

    if (!currentUser) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (payload.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const existing = await service.findUserWithPasswordByEmail(payload.email);
      if (existing && existing.id !== userId) {
        res.status(409).json({ message: "Email is already registered." });
        return;
      }
    }

    let passwordHash: string | undefined;
    if (payload.newPassword) {
      const isCurrentValid = await bcrypt.compare(payload.currentPassword || "", currentUser.password_hash);
      if (!isCurrentValid) {
        res.status(400).json({ message: "Current password is incorrect." });
        return;
      }

      passwordHash = await bcrypt.hash(payload.newPassword, 10);
    }

    const updated = await service.updateUser(userId, {
      email: payload.email,
      fullName: payload.fullName,
      role: currentUser.role,
      status: currentUser.status,
      profileImageUrl:
        payload.profileImageUrl === undefined ? currentUser.profile_image_url : payload.profileImageUrl,
      profileImagePublicId:
        payload.profileImagePublicId === undefined
          ? currentUser.profile_image_public_id
          : payload.profileImagePublicId,
      passwordHash,
    });

    if (!updated) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json({ user: updated });
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/chat", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = aiChatSchema.parse(req.body);

    const systemPrompt = [
      "You are YUNA AI, an assistant for the YUNAfied tutorial management system.",
      "Respond in plain, concise English with practical steps.",
      "Prioritize helping users navigate pages, features, and workflows in YUNAfied.",
      "If asked non-system questions, still answer clearly and accurately in short form.",
      "Avoid long introductions. Keep answers around 3-7 sentences unless the user asks for detail.",
      `Current user role: ${payload.role}. Current page: ${payload.currentView}.`,
    ].join(" ");

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...payload.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: payload.message },
    ];

    const answer = await requestGroqChat({ messages, temperature: 0.2, maxTokens: 220 });

    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/study-guide", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = studyGuideSchema.parse(req.body);

    const systemPrompt = [
      "You are YUNA Study Guide.",
      "Teach using a Socratic style: ask guiding questions, give hints, and break problems into small steps.",
      "Do not give full final answers immediately unless the user explicitly asks for a direct answer.",
      "Use simple language suitable for students and keep responses concise but useful.",
      "When relevant, suggest next practice action or checkpoint.",
      payload.subject ? `Subject context: ${payload.subject}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...payload.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: payload.message },
    ];

    const answer = await requestGroqChat({ messages, temperature: 0.35, maxTokens: 320 });
    res.json({ answer });
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/translate", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payload = translateSchema.parse(req.body);
    const userId = req.auth?.sub;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const messages: GroqMessage[] = [
      {
        role: "system",
        content:
          "You are a precise translation assistant. Return only the translated text. Keep meaning, tone, and formatting from the source.",
      },
      {
        role: "user",
        content: `Translate from ${payload.sourceLanguage} to ${payload.targetLanguage}:\n\n${payload.text}`,
      },
    ];

    const translatedText = await requestGroqChat({ messages, temperature: 0.1, maxTokens: 380 });

    const historyItem = await service.createTranslationHistory({
      userId,
      sourceText: payload.text,
      translatedText,
      sourceLanguage: payload.sourceLanguage,
      targetLanguage: payload.targetLanguage,
    });

    res.status(201).json({ translatedText, historyItem });
  } catch (error) {
    next(error);
  }
});

app.get("/api/translations/history", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const query = translationHistoryQuerySchema.parse(req.query);
    const result = await service.listTranslationHistory({
      userId,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / query.pageSize));
    res.json({
      rows: result.rows,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/bootstrap", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const key = bootstrapCacheKey(req.auth || {});
    const cached = getBootstrapCache(key);
    if (cached) {
      res.json(cached);
      return;
    }

    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    const payload = await service.getBootstrapData(requester);
    setBootstrapCache(key, payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    res.json(await service.listUsers());
  } catch (error) {
    next(error);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["admin", "teacher", "student"]),
  status: z.enum(["active", "inactive"]).default("active"),
  profileImageUrl: z.string().url().nullable().optional(),
  profileImagePublicId: z.string().nullable().optional(),
  password: z.string().min(6),
});

app.post("/api/users", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);
    const exists = await service.findUserWithPasswordByEmail(payload.email);
    if (exists) {
      res.status(409).json({ message: "Email is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await service.createUser({
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      status: payload.status,
      profileImageUrl: payload.profileImageUrl || null,
      profileImagePublicId: payload.profileImagePublicId || null,
      passwordHash,
    });

    res.status(201).json(user);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(["admin", "teacher", "student"]),
  status: z.enum(["active", "inactive"]),
  profileImageUrl: z.string().url().nullable().optional(),
  profileImagePublicId: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

app.put("/api/users/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = updateUserSchema.parse(req.body);
    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

    const updated = await service.updateUser(req.params.id, {
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      status: payload.status,
      profileImageUrl: payload.profileImageUrl || null,
      profileImagePublicId: payload.profileImagePublicId || null,
      passwordHash,
    });

    if (!updated) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.auth?.sub === req.params.id) {
      res.status(400).json({ message: "You cannot delete your own account." });
      return;
    }

    const deleted = await service.deleteUser(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(204).send();
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/uploads/profile-image",
  requireAuth,
  profileImageUpload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "Missing profile image file." });
        return;
      }

      const uploaded = await uploadProfileBufferToCloudinary(req.file);
      res.status(201).json(uploaded);
    } catch (error) {
      next(error);
    }
  },
);

app.get("/api/schedules", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    res.json(await service.listSchedulesForRole(requester));
  } catch (error) {
    next(error);
  }
});

const scheduleDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const scheduleTimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const nullableUuidSchema = z.preprocess((value) => (value === "" ? null : value), z.string().uuid().nullable().optional());

const createStudentScheduleRequestSchema = z.object({
  teacherId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().min(1).max(2000).default(""),
  date: scheduleDateSchema,
  startTime: scheduleTimeSchema,
  endTime: scheduleTimeSchema,
  requestNote: z.string().max(500).optional(),
});

const createManagedScheduleSchema = z.object({
  teacherId: z.string().uuid().optional(),
  studentId: nullableUuidSchema,
  title: z.string().min(2),
  description: z.string().min(1).max(2000).default(""),
  date: scheduleDateSchema,
  startTime: scheduleTimeSchema,
  endTime: scheduleTimeSchema,
});

const teacherRespondScheduleSchema = z
  .object({
    decision: z.enum(["accepted", "declined"]),
    title: z.string().min(2).optional(),
    description: z.string().min(1).max(2000).optional(),
    date: scheduleDateSchema.optional(),
    startTime: scheduleTimeSchema.optional(),
    endTime: scheduleTimeSchema.optional(),
    responseNote: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "declined" && !value.responseNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Decline note is required.",
        path: ["responseNote"],
      });
    }
  });

const moveScheduleSchema = z.object({
  date: scheduleDateSchema,
  startTime: scheduleTimeSchema,
  endTime: scheduleTimeSchema,
  title: z.string().min(2).optional(),
  description: z.string().min(1).max(2000).optional(),
});

const cancelScheduleSchema = z.object({
  responseNote: z.string().min(1).max(500),
});

const adminEditScheduleSchema = z.object({
  teacherId: z.string().uuid().optional(),
  studentId: nullableUuidSchema,
  title: z.string().min(2).optional(),
  description: z.string().min(1).max(2000).optional(),
  date: scheduleDateSchema.optional(),
  startTime: scheduleTimeSchema.optional(),
  endTime: scheduleTimeSchema.optional(),
  status: z.enum(["pending", "accepted", "declined", "cancelled"]).optional(),
  requestNote: z.string().max(500).nullable().optional(),
  responseNote: z.string().max(500).nullable().optional(),
});

const gamifiedCategorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
});

const gamifiedCategoryUpdateSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "At least one field is required.",
  });

const gamifiedChoiceSchema = z.object({
  text: z.string().min(1).max(300),
  isCorrect: z.boolean(),
});

const gamifiedQuestionSchema = z.object({
  prompt: z.string().min(1).max(2000),
  points: z.coerce.number().int().min(1).max(5000).default(1000),
  choices: z.array(gamifiedChoiceSchema).min(2).max(6),
});

const gamifiedQuizSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(2).max(150),
  description: z.string().max(2000).optional().default(""),
  timePerQuestionSeconds: z.coerce.number().int().min(5).max(120).default(20),
  isPublished: z.boolean().optional().default(true),
  questions: z.array(gamifiedQuestionSchema).min(1).max(100),
});

const gamifiedListQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

const gamifiedLeaderboardQuerySchema = z.object({
  categoryId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const gamifiedAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedChoiceId: nullableUuidSchema,
      timeRemainingSeconds: z.coerce.number().int().min(0).max(300).optional().default(0),
    }),
  ),
});

app.post("/api/schedules", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };

    if (!requester.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (requester.role === "student") {
      const payload = createStudentScheduleRequestSchema.parse(req.body);
      const schedule = await service.createScheduleRequest({
        ...payload,
        studentId: requester.id,
      });
      res.status(201).json(schedule);
      clearBootstrapCache();
      return;
    }

    if (requester.role === "teacher" || requester.role === "admin") {
      const payload = createManagedScheduleSchema.parse(req.body);
      const teacherId = requester.role === "teacher" ? requester.id : payload.teacherId;

      if (!teacherId) {
        res.status(400).json({ message: "teacherId is required for admin schedule creation." });
        return;
      }

      const schedule = await service.createManagedSchedule({
        title: payload.title,
        description: payload.description,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        teacherId,
        studentId: payload.studentId || null,
      });
      res.status(201).json(schedule);
      clearBootstrapCache();
      return;
    }

    res.status(403).json({ message: "Forbidden" });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/schedules/:id/respond", requireAuth, requireRole("teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = teacherRespondScheduleSchema.parse(req.body);
    const teacherId = req.auth?.sub;

    if (!teacherId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const updated = await service.teacherRespondToSchedule(req.params.id, teacherId, payload);
    if (!updated) {
      res.status(404).json({ message: "Schedule request not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/schedules/:id/move", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = moveScheduleSchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    const updated = await service.moveSchedule(req.params.id, requester, payload);

    if (!updated) {
      res.status(404).json({ message: "Schedule not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/schedules/:id/cancel", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = cancelScheduleSchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    const updated = await service.cancelSchedule(req.params.id, requester, payload.responseNote);

    if (!updated) {
      res.status(404).json({ message: "Schedule not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/schedules/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = adminEditScheduleSchema.parse(req.body);
    const updated = await service.adminEditSchedule(req.params.id, payload);

    if (!updated) {
      res.status(404).json({ message: "Schedule not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.delete("/api/schedules/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    const deleted = await service.deleteSchedule(req.params.id, requester);

    if (!deleted) {
      res.status(404).json({ message: "Schedule not found." });
      return;
    }

    res.status(204).send();
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.get("/api/gamified/categories", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterRole = req.auth?.role || "student";
    res.json(await service.listGamifiedCategories(requesterRole));
  } catch (error) {
    next(error);
  }
});

app.post("/api/gamified/categories", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = gamifiedCategorySchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "teacher" };

    if (!requester.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const created = await service.createGamifiedCategory(payload, requester);
    res.status(201).json(created);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.patch("/api/gamified/categories/:id", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = gamifiedCategoryUpdateSchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "teacher" };

    const updated = await service.updateGamifiedCategory(req.params.id, payload, requester);
    if (!updated) {
      res.status(404).json({ message: "Category not found." });
      return;
    }

    res.json(updated);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get("/api/gamified/quizzes", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = gamifiedListQuerySchema.parse(req.query);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    res.json(await service.listGamifiedQuizzes(requester, query));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get("/api/gamified/quizzes/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    const includeAnswerKeys = requester.role === "admin" || requester.role === "teacher";
    const quiz = await service.getGamifiedQuizDetail(req.params.id, requester, includeAnswerKeys);

    if (!quiz) {
      res.status(404).json({ message: "Quiz not found." });
      return;
    }

    res.json(quiz);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post("/api/gamified/quizzes", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = gamifiedQuizSchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "teacher" };

    if (!requester.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const quiz = await service.createGamifiedQuiz(payload, requester);
    res.status(201).json(quiz);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.put("/api/gamified/quizzes/:id", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = gamifiedQuizSchema.parse(req.body);
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "teacher" };

    const quiz = await service.updateGamifiedQuiz(req.params.id, payload, requester);
    if (!quiz) {
      res.status(404).json({ message: "Quiz not found." });
      return;
    }

    res.json(quiz);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.post("/api/gamified/quizzes/:id/attempts", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = gamifiedAttemptSchema.parse(req.body);
    const studentId = req.auth?.sub;

    if (!studentId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const attempt = await service.submitGamifiedAttempt(req.params.id, studentId, payload);
    res.status(201).json(attempt);
    clearBootstrapCache();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get("/api/gamified/leaderboard", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const query = gamifiedLeaderboardQuerySchema.parse(req.query);
    res.json(await service.listGamifiedLeaderboard(query.categoryId, query.limit));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

app.get("/api/assignments", requireAuth, async (_req, res, next) => {
  try {
    res.json(await service.listAssignments());
  } catch (error) {
    next(error);
  }
});

const createAssignmentSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

app.post("/api/assignments", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createAssignmentSchema.parse(req.body);
    const teacherId = req.auth?.sub;

    if (!teacherId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const assignment = await service.createAssignment({ ...payload, teacherId });
    res.status(201).json(assignment);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.get("/api/submissions", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requester = { id: req.auth?.sub || "", role: req.auth?.role || "student" };
    res.json(await service.listSubmissionsForRole(requester));
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/assignments/:assignmentId/submissions",
  requireAuth,
  requireRole("student"),
  upload.single("file"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const assignmentId = req.params.assignmentId;
      const studentId = req.auth?.sub;

      if (!studentId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const contentText = typeof body.contentText === "string" ? body.contentText : null;
      const fileName = req.file ? req.file.originalname : null;
      const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

      if (!contentText && !fileUrl) {
        res.status(400).json({ message: "Submission requires text content or a file." });
        return;
      }

      const submission = await service.upsertSubmission({
        assignmentId,
        studentId,
        contentText,
        fileName,
        fileUrl,
      });

      res.status(201).json(submission);
      clearBootstrapCache();
    } catch (error) {
      next(error);
    }
  },
);

const gradeSchema = z.object({
  grade: z.string().min(1),
  feedback: z.string().min(1),
});

app.patch("/api/submissions/:id/grade", requireAuth, requireRole("admin", "teacher"), async (req, res, next) => {
  try {
    const payload = gradeSchema.parse(req.body);
    const submission = await service.gradeSubmission({
      submissionId: req.params.id,
      grade: payload.grade,
      feedback: payload.feedback,
    });

    if (!submission) {
      res.status(404).json({ message: "Submission not found." });
      return;
    }

    res.json(submission);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.get("/api/announcements", requireAuth, async (_req, res, next) => {
  try {
    res.json(await service.listAnnouncements());
  } catch (error) {
    next(error);
  }
});

const createAnnouncementSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(2),
});

app.post("/api/announcements", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createAnnouncementSchema.parse(req.body);
    const postedById = req.auth?.sub;

    if (!postedById) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const announcement = await service.createAnnouncement({
      title: payload.title,
      content: payload.content,
      postedById,
    });

    res.status(201).json(announcement);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Invalid request payload", issues: error.issues });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({ message: (error as Error).message });
    return;
  }

  if (error instanceof Error) {
    res.status(500).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: "Unexpected server error" });
});

async function start(): Promise<void> {
  await testDatabaseConnection();
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
