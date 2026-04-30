import "dotenv/config";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdirSync, promises as fs } from "node:fs";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import { z } from "zod";
import { testDatabaseConnection } from "./lib/db.js";
import { AuthenticatedRequest, requireAuth, requireRole, signAccessToken } from "./middleware/auth.js";
import { YunafiedService } from "./services/YunafiedService.js";

const execFileAsync = promisify(execFile);

const app = express();
const port = Number(process.env.PORT || 4000);
const service = new YunafiedService();
const BOOTSTRAP_CACHE_TTL_MS = 8000;
const bootstrapCache = new Map<string, { expiresAt: number; data: unknown }>();

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PythonVideoToolResult {
  transcript?: string;
  error?: string;
}

interface ChunkSummary {
  main_topic: string;
  key_points: string[];
  important_insights: string[];
  conclusions: string[];
}

interface VideoSummaryPayload {
  title: string;
  summary: string[];
  takeaways: string[];
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const pythonVideoToolPath = path.join(projectRoot, "python", "video_pipeline.py");
const workspaceVenvPython = path.join(workspaceRoot, ".venv", "Scripts", "python.exe");

function extractYoutubeVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (url.searchParams.has("v")) {
      return url.searchParams.get("v");
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    const shortsIndex = pathParts.indexOf("shorts");
    if (shortsIndex >= 0 && pathParts[shortsIndex + 1]) {
      return pathParts[shortsIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

type PythonRunner = { bin: string; prefix: string[] };

const pythonRunners: PythonRunner[] = [
  ...(process.env.PYTHON_BIN ? [{ bin: process.env.PYTHON_BIN, prefix: [] }] : []),
  { bin: workspaceVenvPython, prefix: [] },
  { bin: "python", prefix: [] },
  { bin: "py", prefix: ["-3"] },
];

let resolvedPythonRunner: PythonRunner | null = null;

async function getPythonRunner(): Promise<PythonRunner> {
  if (resolvedPythonRunner) {
    return resolvedPythonRunner;
  }

  await fs.access(pythonVideoToolPath);

  for (const candidate of pythonRunners) {
    try {
      await execFileAsync(candidate.bin, [...candidate.prefix, "--version"]);
      resolvedPythonRunner = candidate;
      return candidate;
    } catch {
      // Continue trying the next Python executable candidate.
    }
  }

  throw new Error("Python runtime was not found. Install Python 3.10+ and ensure it is available in PATH.");
}

function parseFirstJsonObject(raw: string): unknown {
  const direct = raw.trim();
  if (!direct) {
    throw new Error("Received empty output.");
  }

  try {
    return JSON.parse(direct);
  } catch {
    const start = direct.indexOf("{");
    const end = direct.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(direct.slice(start, end + 1));
    }
    throw new Error("Output was not valid JSON.");
  }
}

async function runPythonVideoTool(command: string, args: string[]): Promise<PythonVideoToolResult> {
  const runner = await getPythonRunner();

  const { stdout, stderr } = await execFileAsync(
    runner.bin,
    [...runner.prefix, pythonVideoToolPath, command, ...args],
    {
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        FFMPEG_BINARY: (ffmpegPath as unknown as string | undefined) || process.env.FFMPEG_BINARY || "ffmpeg",
      },
    },
  );

  const parsed = parseFirstJsonObject(stdout) as PythonVideoToolResult;
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  if (!parsed.transcript?.trim()) {
    throw new Error(stderr?.trim() || "Transcription tool returned no transcript.");
  }

  return parsed;
}

async function fetchYoutubeTranscriptByVideoId(videoId: string): Promise<string> {
  const result = await runPythonVideoTool("fetch_youtube_transcript", ["--video-id", videoId]);
  return result.transcript!.trim();
}

async function transcribeUploadedVideoWithWhisper(filePath: string): Promise<string> {
  const result = await runPythonVideoTool("transcribe_video_file", ["--video-path", filePath]);
  return result.transcript!.trim();
}

async function transcribeYoutubeWithWhisper(videoUrl: string): Promise<string> {
  const result = await runPythonVideoTool("transcribe_youtube_video", ["--video-url", videoUrl]);
  return result.transcript!.trim();
}

function cleanTranscriptText(input: string): string {
  const fillerWordRegex = /\b(um+|uh+|erm|ah+|you know|i mean|sort of|kind of|like)\b/gi;
  const squashed = input
    .replace(/[\t\r\n]+/g, " ")
    .replace(fillerWordRegex, " ")
    .replace(/\b(\w+)(\s+\1\b)+/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  const sentenceLike = squashed
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const piece of sentenceLike) {
    const normalized = piece.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(piece);
  }

  return deduped.join(" ").replace(/\s+/g, " ").trim();
}

function splitTranscriptIntoChunks(transcript: string, maxWords = 1800): string[] {
  const words = transcript.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return [transcript];
  }

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }

  return chunks;
}

function normalizeList(input: unknown, limit = 6): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim());

  return Array.from(new Set(normalized)).slice(0, limit);
}

function normalizeStructuredSummary(input: unknown): VideoSummaryPayload {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const title = String(source.title || "Video Summary").trim() || "Video Summary";
  const summary = normalizeList(source.summary, 8);
  const takeaways = normalizeList(source.takeaways, 5);

  if (!summary.length) {
    throw new Error("Summarizer returned no key points.");
  }

  return {
    title,
    summary,
    takeaways,
  };
}

function normalizeChunkSummary(input: unknown): ChunkSummary {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  return {
    main_topic: String(source.main_topic || "").trim(),
    key_points: normalizeList(source.key_points, 6),
    important_insights: normalizeList(source.important_insights, 4),
    conclusions: normalizeList(source.conclusions, 4),
  };
}

async function summarizeChunk(input: {
  transcriptChunk: string;
  context?: string;
  chunkIndex: number;
  totalChunks: number;
}): Promise<ChunkSummary> {
  const answer = await requestGroqChat({
    messages: [
      {
        role: "system",
        content:
          "Extract only the most relevant information. Return strict JSON only with this schema: {\"main_topic\": string, \"key_points\": string[], \"important_insights\": string[], \"conclusions\": string[] }.",
      },
      {
        role: "user",
        content: [
          input.context ? `Context: ${input.context.trim()}` : "",
          `Chunk ${input.chunkIndex}/${input.totalChunks}`,
          "Summarize only main topic, key points, important insights, and conclusions.",
          `Transcript chunk: ${input.transcriptChunk}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.1,
    maxTokens: 500,
  });

  return normalizeChunkSummary(parseFirstJsonObject(answer));
}

async function summarizeSingleTranscript(input: { transcript: string; context?: string }): Promise<VideoSummaryPayload> {
  const answer = await requestGroqChat({
    messages: [
      {
        role: "system",
        content:
          "Extract only main topic, key points, important insights, and conclusions. Return strict JSON only with schema: {\"title\": string, \"summary\": string[], \"takeaways\": string[] }.",
      },
      {
        role: "user",
        content: [
          input.context ? `Context: ${input.context.trim()}` : "",
          "Do not add anything outside the requested JSON schema.",
          `Transcript: ${input.transcript}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.1,
    maxTokens: 550,
  });

  return normalizeStructuredSummary(parseFirstJsonObject(answer));
}

async function summarizeChunkedTranscript(input: {
  chunks: string[];
  context?: string;
}): Promise<VideoSummaryPayload> {
  const chunkSummaries: ChunkSummary[] = [];
  for (let index = 0; index < input.chunks.length; index += 1) {
    const chunkSummary = await summarizeChunk({
      transcriptChunk: input.chunks[index],
      context: input.context,
      chunkIndex: index + 1,
      totalChunks: input.chunks.length,
    });
    chunkSummaries.push(chunkSummary);
  }

  const answer = await requestGroqChat({
    messages: [
      {
        role: "system",
        content:
          "Combine chunk summaries and return strict JSON only with schema: {\"title\": string, \"summary\": string[], \"takeaways\": string[] }. summary must contain key points and important insights only.",
      },
      {
        role: "user",
        content: [
          input.context ? `Context: ${input.context.trim()}` : "",
          "Create a final concise summary from these chunk summaries.",
          JSON.stringify(chunkSummaries),
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    temperature: 0.1,
    maxTokens: 650,
  });

  return normalizeStructuredSummary(parseFirstJsonObject(answer));
}

async function summarizeTranscript(input: { transcript: string; context?: string }): Promise<VideoSummaryPayload> {
  const cleanedTranscript = cleanTranscriptText(input.transcript);
  if (!cleanedTranscript) {
    throw new Error("No usable transcript text was produced.");
  }

  const chunks = splitTranscriptIntoChunks(cleanedTranscript, 1800);
  if (chunks.length <= 1) {
    return summarizeSingleTranscript({ transcript: cleanedTranscript, context: input.context });
  }

  return summarizeChunkedTranscript({ chunks, context: input.context });
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

const learningMaterialUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx", ".xls", ".xlsx"];
    if (!allowed.includes(ext)) {
      cb(new Error("Only PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, and XLSX files are allowed."));
      return;
    }
    cb(null, true);
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".mp4", ".m4v", ".mov", ".mkv", ".webm", ".avi"];
    if (!allowed.includes(ext)) {
      cb(new Error("Only MP4, M4V, MOV, MKV, WEBM, and AVI videos are allowed."));
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

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.resolve(__dirname, "../public")));
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

const videoSummarySchema = z.object({
  videoUrl: z.string().url(),
  context: z.string().max(800).optional(),
});

const translationHistoryQuerySchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(6),
});

const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const enrollmentSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid(),
  subject: z.string().min(2).max(200),
  tutorialGroup: z.string().max(120).optional(),
  status: z.enum(["active", "completed", "dropped"]).default("active"),
  note: z.string().max(1000).optional(),
});

const enrollmentUpdateSchema = z.object({
  subject: z.string().min(2).max(200).optional(),
  tutorialGroup: z.string().max(120).nullable().optional(),
  status: z.enum(["active", "completed", "dropped"]).optional(),
  note: z.string().max(1000).nullable().optional(),
});

const materialLinkSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(2).max(200),
  url: z.string().url(),
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

app.post(
  "/api/ai/video-summary",
  requireAuth,
  videoUpload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl : undefined;
    const uploadedVideoPath = req.file?.path;

    let transcript = "";
    let transcriptFetchError: string | null = null;

    if (uploadedVideoPath) {
      transcript = await transcribeUploadedVideoWithWhisper(uploadedVideoPath);
    } else if (videoUrl) {
      const videoId = extractYoutubeVideoId(videoUrl);
      if (!videoId) {
        res.status(400).json({ message: "Please provide a valid YouTube URL." });
        return;
      }

      try {
        transcript = await fetchYoutubeTranscriptByVideoId(videoId);
      } catch (error) {
        transcriptFetchError = error instanceof Error ? error.message : "Transcript fetch failed.";
      }

      if (!transcript.trim()) {
        try {
          transcript = await transcribeYoutubeWithWhisper(videoUrl);
        } catch (error) {
          const fallbackError = error instanceof Error ? error.message : "YouTube transcription fallback failed.";
          throw new Error(
            `Unable to process this YouTube video. Transcript fetch failed: ${transcriptFetchError || "Unknown error"}. Fallback transcription failed: ${fallbackError}`,
          );
        }
      }
    } else {
      res.status(400).json({ message: "Provide a video file or a YouTube URL." });
      return;
    }

    const structuredSummary = await summarizeTranscript({ transcript, context });

    res.json(structuredSummary);
  } catch (error) {
    next(error);
  } finally {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }
  }
  },
);

app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    const role = req.auth?.role;

    if (!userId || !role) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const query = notificationsQuerySchema.parse(req.query);
    const requester = { id: userId, role };
    const [assignments, submissions, schedules, announcements] = await Promise.all([
      service.listAssignments(),
      service.listSubmissionsForRole(requester),
      service.listSchedulesForRole(requester),
      service.listAnnouncements(),
    ]);

    type NotificationItem = {
      id: string;
      type: "assignment" | "submission" | "announcement" | "schedule" | "grade";
      title: string;
      message: string;
      priority: "low" | "medium" | "high";
      createdAt: string;
      actionView: string;
    };

    const now = new Date();
    const notificationRows: NotificationItem[] = [];

    for (const announcement of announcements.slice(0, 8)) {
      notificationRows.push({
        id: `announcement:${announcement.id}`,
        type: "announcement",
        title: "New announcement",
        message: `${announcement.title} by ${announcement.postedByName}`,
        priority: "medium",
        createdAt: announcement.createdAt,
        actionView: "announcements",
      });
    }

    if (role === "student") {
      const mySubmissionByAssignment = new Set(submissions.map((item) => item.assignmentId));

      for (const assignment of assignments) {
        const due = new Date(assignment.dueDate);
        const hoursUntilDue = (due.getTime() - now.getTime()) / 36e5;
        const submitted = mySubmissionByAssignment.has(assignment.id);

        if (!submitted && hoursUntilDue <= 72 && hoursUntilDue >= -24) {
          notificationRows.push({
            id: `assignment-due:${assignment.id}`,
            type: "assignment",
            title: "Assignment due soon",
            message: `${assignment.title} is due on ${assignment.dueDate}.`,
            priority: hoursUntilDue <= 24 ? "high" : "medium",
            createdAt: assignment.createdAt,
            actionView: "assignments",
          });
        }
      }

      for (const submission of submissions) {
        if (submission.grade) {
          notificationRows.push({
            id: `grade:${submission.id}`,
            type: "grade",
            title: "Submission graded",
            message: `${submission.assignmentTitle}: grade ${submission.grade}`,
            priority: "medium",
            createdAt: submission.gradedAt || submission.submittedAt,
            actionView: "grades",
          });
        }
      }
    } else {
      const ungraded = submissions.filter((item) => !item.grade);
      for (const submission of ungraded.slice(0, 12)) {
        notificationRows.push({
          id: `submission:${submission.id}`,
          type: "submission",
          title: "New submission needs grading",
          message: `${submission.studentName} submitted ${submission.assignmentTitle}.`,
          priority: "high",
          createdAt: submission.submittedAt,
          actionView: "assignments",
        });
      }
    }

    for (const schedule of schedules.slice(0, 12)) {
      if (schedule.status === "pending") {
        notificationRows.push({
          id: `schedule-pending:${schedule.id}`,
          type: "schedule",
          title: "Schedule request pending",
          message: `${schedule.title} on ${schedule.date} ${schedule.startTime}-${schedule.endTime}`,
          priority: "medium",
          createdAt: schedule.updatedAt || schedule.createdAt,
          actionView: "schedule",
        });
      }
    }

    notificationRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(notificationRows.slice(0, query.limit));
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
    const includeAnswerKeys = true;
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

const createDirectChatSchema = z.object({
  otherUserId: z.string().uuid(),
});

const createGroupChatSchema = z.object({
  name: z.string().min(2),
  participantIds: z.array(z.string().uuid()).min(1),
});

const chatMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

const listMessagesSchema = z.object({
  withUserId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

function canDirectMessage(requesterRole: "admin" | "teacher" | "student", receiverRole: "admin" | "teacher" | "student"): boolean {
  if (requesterRole === "admin") {
    return true;
  }
  if (requesterRole === "teacher") {
    return receiverRole === "student" || receiverRole === "admin";
  }
  return receiverRole === "teacher" || receiverRole === "admin";
}

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

app.get("/api/chats/users", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(await service.listChatUsers(requesterId));
  } catch (error) {
    next(error);
  }
});

app.get("/api/chats", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(await service.listChatsForUser(requesterId));
  } catch (error) {
    next(error);
  }
});

app.post("/api/chats/direct", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createDirectChatSchema.parse(req.body);
    const requesterId = req.auth?.sub;

    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (payload.otherUserId === requesterId) {
      res.status(400).json({ message: "You cannot start a chat with yourself." });
      return;
    }

    const chat = await service.openOrCreateDirectChat(requesterId, payload.otherUserId);
    res.status(201).json(chat);
  } catch (error) {
    next(error);
  }
});

app.post("/api/chats/group", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createGroupChatSchema.parse(req.body);
    const requesterId = req.auth?.sub;

    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const chat = await service.createGroupChat({
      requesterId,
      name: payload.name,
      participantIds: payload.participantIds,
    });
    res.status(201).json(chat);
  } catch (error) {
    next(error);
  }
});

app.get("/api/chats/:chatId/messages", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const rows = await service.listChatMessages(req.params.chatId, requesterId);
    if (!rows) {
      res.status(403).json({ message: "You do not have access to this chat." });
      return;
    }

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/chats/:chatId/messages", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = chatMessageSchema.parse(req.body);
    const requesterId = req.auth?.sub;

    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const row = await service.sendChatMessage({
      chatId: req.params.chatId,
      senderId: requesterId,
      body: payload.body,
    });

    if (!row) {
      res.status(403).json({ message: "You do not have access to this chat." });
      return;
    }

    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

app.get("/api/enrollments", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const rows = await service.listEnrollmentRecords({ id: requesterId, role: requesterRole });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/enrollments", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const creatorId = req.auth?.sub;
    if (!creatorId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = enrollmentSchema.parse(req.body);
    const row = await service.createEnrollmentRecord({
      ...payload,
      tutorialGroup: payload.tutorialGroup || null,
      note: payload.note || null,
      createdById: creatorId,
    });

    res.status(201).json(row);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.patch("/api/enrollments/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = enrollmentUpdateSchema.parse(req.body);
    const row = await service.updateEnrollmentRecord(req.params.id, payload);

    if (!row) {
      res.status(404).json({ message: "Enrollment record not found." });
      return;
    }

    res.json(row);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/enrollments/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const deleted = await service.deleteEnrollmentRecord(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "Enrollment record not found." });
      return;
    }

    res.status(204).send();
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.get("/api/materials", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json(await service.listLearningMaterials({ id: requesterId, role: requesterRole }));
  } catch (error) {
    next(error);
  }
});

app.post("/api/materials/link", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const creatorId = req.auth?.sub;
    if (!creatorId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = materialLinkSchema.parse(req.body);
    const row = await service.createLearningMaterial({
      title: payload.title,
      description: payload.description || null,
      subject: payload.subject,
      materialType: "link",
      resourceUrl: payload.url,
      fileName: null,
      createdById: creatorId,
    });

    res.status(201).json(row);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/materials/file",
  requireAuth,
  requireRole("admin", "teacher"),
  learningMaterialUpload.single("file"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const creatorId = req.auth?.sub;
      if (!creatorId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ message: "Missing learning material file." });
        return;
      }

      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : null;

      if (!title || title.length < 2) {
        res.status(400).json({ message: "Title is required." });
        return;
      }
      if (!subject || subject.length < 2) {
        res.status(400).json({ message: "Subject is required." });
        return;
      }

      const row = await service.createLearningMaterial({
        title,
        description,
        subject,
        materialType: "file",
        resourceUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        createdById: creatorId,
      });

      res.status(201).json(row);
      clearBootstrapCache();
    } catch (error) {
      next(error);
    }
  },
);

app.delete("/api/materials/:id", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;
    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const deleted = await service.deleteLearningMaterial({
      id: req.params.id,
      requesterId,
      requesterRole,
    });

    if (!deleted) {
      res.status(404).json({ message: "Learning material not found." });
      return;
    }

    res.status(204).send();
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

app.get("/api/messages/users", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const rows = await service.listMessageRecipients({ requesterId, requesterRole });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/messages", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const query = listMessagesSchema.parse(req.query);
    const otherUser = await service.findUserWithPasswordById(query.withUserId);

    if (!otherUser) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!canDirectMessage(requesterRole, otherUser.role)) {
      res.status(403).json({ message: "Messaging is not allowed for this recipient." });
      return;
    }

    const rows = await service.listMessagesBetweenUsers({
      requesterId,
      otherUserId: query.withUserId,
    });
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/messages", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    const requesterRole = req.auth?.role;

    if (!requesterId || !requesterRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = sendMessageSchema.parse(req.body);
    const receiver = await service.findUserWithPasswordById(payload.receiverId);

    if (!receiver) {
      res.status(404).json({ message: "Receiver not found." });
      return;
    }

    if (!canDirectMessage(requesterRole, receiver.role)) {
      res.status(403).json({ message: "Messaging is not allowed for this recipient." });
      return;
    }

    const message = await service.sendMessage({
      senderId: requesterId,
      receiverId: payload.receiverId,
      body: payload.body.trim(),
    });

    res.status(201).json(message);
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
