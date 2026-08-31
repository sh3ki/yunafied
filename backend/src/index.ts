import "dotenv/config";
import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { mkdirSync, promises as fs } from "node:fs";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { v2 as cloudinary } from "cloudinary";
import compression from "compression";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { testDatabaseConnection, pool } from "./lib/db.js";
import { AuthenticatedRequest, requireAuth, requireRole, signAccessToken } from "./middleware/auth.js";
import { YunafiedService } from "./services/YunafiedService.js";

const execFileAsync = promisify(execFile);

const app = express();
const port = Number(process.env.PORT || 4000);
const service = new YunafiedService();
const BOOTSTRAP_CACHE_TTL_MS = 30000;
const bootstrapCache = new Map<string, { expiresAt: number; data: unknown }>();
const GROQ_CHAT_MODEL = "openai/gpt-oss-120b";

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

// ---------------------------------------------------------------------------
// Email (Resend HTTP API — works on Render free tier, no SMTP port blocking)
// ---------------------------------------------------------------------------
const resend = new Resend(process.env.RESEND_API_KEY || "");

function generateOtp(): string {
  // Cryptographically random 6-digit code
  const num = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return String(num).padStart(6, "0");
}

async function sendOtpEmail(toEmail: string, otpCode: string, firstName: string, isReset = false): Promise<void> {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const subject = isReset ? "Your YUNAFied Password Reset Code" : "Your YUNAFied Verification Code";
  const heading = isReset ? `Password Reset Request` : `Welcome to YUNAFied, ${firstName}!`;
  const description = isReset
    ? `Use the code below to reset your password. It expires in <strong>10 minutes</strong>.`
    : `Use the verification code below to activate your account. It expires in <strong>10 minutes</strong>.`;
  const footer = isReset
    ? "If you did not request a password reset, you can safely ignore this email."
    : "If you did not create a YUNAFied account, you can safely ignore this email.";
  await resend.emails.send({
    from: `YUNAFied <${from}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8f9ff;padding:32px;border-radius:12px">
        <h2 style="color:#4f46e5;margin:0 0 8px">${heading}</h2>
        <p style="color:#374151;margin:0 0 24px">${description}</p>
        <div style="background:#fff;border:2px solid #e0e7ff;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#4f46e5">${otpCode}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0">${footer}</p>
      </div>
    `,
  });
}

function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function sendVerificationLinkEmail(toEmail: string, firstName: string, token: string): Promise<void> {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const appUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || "http://localhost:5173";
  const verifyUrl = `${appUrl.replace(/\/$/, "")}/verify-account?token=${encodeURIComponent(token)}`;
  await resend.emails.send({
    from: `YUNAfied <${from}>`,
    to: toEmail,
    subject: "Complete your YUNAfied account setup",
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8f9ff;padding:32px;border-radius:12px">
      <h2 style="color:#4f46e5;margin:0 0 8px">Welcome to YUNAfied, ${firstName}!</h2>
      <p style="color:#374151;margin:0 0 24px">Your account has been enrolled. Click the button below to verify your email and create your password. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Verify This Account</a>
      <p style="color:#6b7280;font-size:13px;margin-top:24px">If you did not expect this account, you can safely ignore this email.</p>
    </div>`,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const pythonVideoToolPath = path.join(projectRoot, "python", "video_pipeline.py");
const workspaceVenvPython = path.join(workspaceRoot, ".venv", "Scripts", "python.exe");
const workspaceVenvPythonUnix = path.join(workspaceRoot, ".venv", "bin", "python");

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
  { bin: workspaceVenvPythonUnix, prefix: [] },
  { bin: "python3", prefix: [] },
  { bin: "python", prefix: [] },
  { bin: "/usr/bin/python3", prefix: [] },
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

  let stdout: string;
  let stderr: string;
  try {
    const res = await execFileAsync(
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
    stdout = res.stdout;
    stderr = res.stderr;
  } catch (err: any) {
    // Provide clearer error details including stderr when available
    const errStdout = err.stdout ? String(err.stdout) : "";
    const errStderr = err.stderr ? String(err.stderr) : err.message || "";
    throw new Error(`Python transcription failed: ${errStderr || errStdout}`);
  }

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
  reasoningEffort?: "low" | "medium" | "high";
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
      model: GROQ_CHAT_MODEL,
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 220,
      reasoning_effort: input.reasoningEffort ?? "low",
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

// All multer instances use memoryStorage — safe for Render Free Tier (no persistent disk)
const memStorage = multer.memoryStorage();

const upload = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx"];
    if (!allowed.includes(ext)) {
      cb(new Error("Only PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, and PPTX files are allowed."));
      return;
    }
    cb(null, true);
  },
});

const profileImageUpload = multer({
  storage: memStorage,
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
  storage: memStorage,
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
  storage: memStorage,
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

async function uploadDocumentBufferToCloudinary(file: Express.Multer.File): Promise<{ secureUrl: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "yunafied/documents",
        resource_type: "auto",
        type: "upload",
        access_mode: "public",
        public_id: `${Date.now()}_${safeName}`,
        use_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary document upload failed."));
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

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
          "connect-src": ["'self'", "https://www.yunafied.online"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
        },
      },
    }),
  );

  // CORS: allow www origin (DNS redirects www→apex, so preflight must not be redirected)
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? ["https://www.yunafied.online"]
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://www.yunafied.online",
      ];

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );
  // Ensure preflight requests are handled
  app.options("*", cors());

// Enable trust proxy with explicit hop count (not boolean true) so
// express-rate-limit can safely derive client IP behind proxies.
// Render + edge proxy setups typically work with 1 hop.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 1);
app.set("trust proxy", Number.isFinite(trustProxyHops) && trustProxyHops >= 1 ? trustProxyHops : 1);

app.use(compression());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.resolve(__dirname, "../public")));
app.use("/uploads", express.static(uploadsDir));

// Rate limiting — Render Free Tier: single instance, MemoryStore is acceptable
const generalLimiter = rateLimit({
  // Allow more throughput for common polling patterns by using a 1-minute
  // window with a generous max. Polling endpoints (chat, notifications)
  // can easily exceed small 15-minute buckets when clients poll every few
  // seconds. Set `max` high enough and return a `Retry-After` header on 429.
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((60 * 1000) / 1000); // seconds
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ message: "Too many requests. Please try again later." });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed authentication attempts — successful logins should not
  // contribute to throttling. Also provide a clearer 429 handler that sets
  // a `Retry-After` header so clients know when to try again.
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    const retryAfter = Math.ceil((15 * 60 * 1000) / 1000); // seconds
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI rate limit reached. Please wait a moment." },
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api", generalLimiter);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  middleName: z.string().optional(),
  lastName: z.string().min(2),
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
  gradeLevel: z.string().max(120).optional(),
  status: z.enum(["active", "completed", "dropped", "archived"]).default("active"),
  note: z.string().max(1000).optional(),
});

const enrollmentUpdateSchema = z.object({
  subject: z.string().min(2).max(200).optional(),
  tutorialGroup: z.string().max(120).nullable().optional(),
  gradeLevel: z.string().max(120).nullable().optional(),
  status: z.enum(["active", "completed", "dropped", "archived"]).optional(),
  note: z.string().max(1000).nullable().optional(),
  dropReason: z.string().max(1000).nullable().optional(),
  dropDate: z.string().date().nullable().optional(),
  actionTaken: z.string().max(1000).nullable().optional(),
  pullOutReason: z.string().max(1000).nullable().optional(),
  statusNotes: z.string().max(2000).nullable().optional(),
});

const materialLinkSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  subject: z.string().min(2).max(200),
  url: z.string().url(),
});

const updateProfileSchema = z
  .object({
    firstName: z.string().min(2),
    middleName: z.string().optional(),
    lastName: z.string().min(2),
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
    res.status(403).json({ message: "Self-registration is disabled. Please contact the YUNAfied administrator." });
    return;
    /* const payload = signupSchema.parse(req.body);
    const exists = await service.findUserWithPasswordByEmail(payload.email);
    if (exists) {
      res.status(409).json({ message: "Email is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    // Create user as unverified — OTP must be confirmed before they can log in
    const user = await service.createUser({
      email: payload.email,
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
      role: "student",
      status: "active",
      profileImageUrl: null,
      profileImagePublicId: null,
      passwordHash,
      isVerified: false,
    });

    // Generate OTP and save it (10-minute expiry)
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await service.saveOtp(user.id, otpCode, expiresAt);

    // Send verification email (non-blocking — don't fail registration if SMTP is misconfigured)
    try {
      await sendOtpEmail(user.email, otpCode, user.firstName);
    } catch (emailErr) {
      console.error("[SMTP] Failed to send OTP email:", emailErr);
    }

    res.status(201).json({ needsVerification: true, email: user.email }); */
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = z.object({ email: z.string().email(), otp: z.string().length(6) }).parse(req.body);

    const row = await service.verifyOtp(email, otp);
    if (!row) {
      res.status(400).json({ message: "Invalid or expired verification code. Please request a new one." });
      return;
    }

    if (row.status === "inactive") {
      res.status(403).json({ message: "Your account is inactive. Please contact the administrator." });
      return;
    }

    const sanitized = service.toAuthUser(row);
    const token = signAccessToken({ sub: sanitized.id, email: sanitized.email, role: sanitized.role });
    res.json({ token, user: sanitized });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/resend-otp", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const row = await service.findUserWithPasswordByEmail(email);
    if (!row) {
      // Return success anyway to avoid user enumeration
      res.json({ message: "If that email exists, a new code has been sent." });
      return;
    }

    if (row.is_verified) {
      res.status(400).json({ message: "This account is already verified." });
      return;
    }

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await service.saveOtp(row.id, otpCode, expiresAt);

    try {
      await sendOtpEmail(row.email, otpCode, row.first_name);
    } catch (emailErr) {
      console.error("[SMTP] Failed to resend OTP email:", emailErr);
    }

    res.json({ message: "A new verification code has been sent to your email." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/forgot-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const row = await service.findUserWithPasswordByEmail(email);
    if (row) {
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await service.saveOtp(row.id, otpCode, expiresAt);

      try {
        await sendOtpEmail(row.email, otpCode, row.first_name, true);
      } catch (emailErr) {
        console.error("[SMTP] Failed to send password reset OTP email:", emailErr);
      }
    }

    // Always respond the same to avoid user enumeration
    res.json({ message: "If that email exists, a password reset code has been sent." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp, newPassword } = z
      .object({ email: z.string().email(), otp: z.string().length(6), newPassword: z.string().min(6) })
      .parse(req.body);

    const row = await service.findUserWithPasswordByEmail(email);
    if (!row || !row.otp_code || row.otp_code !== otp || !row.otp_expires_at || new Date(row.otp_expires_at) < new Date()) {
      res.status(400).json({ message: "Invalid or expired reset code." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1, otp_code = NULL, otp_expires_at = NULL WHERE id = $2",
      [passwordHash, row.id],
    );

    res.json({ message: "Password reset successfully." });
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

    if (user.status !== "active") {
      res.status(403).json({ message: user.status === "pending" ? "Please verify your account using the link sent to your email." : "Your account is not active. Please contact the administrator." });
      return;
    }

    // Block unverified self-registered users and prompt them to verify
    if (!user.is_verified) {
      // Issue a fresh OTP so they can verify right away
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await service.saveOtp(user.id, otpCode, expiresAt);
      try {
        await sendOtpEmail(user.email, otpCode, user.first_name);
      } catch (emailErr) {
        console.error("[SMTP] Failed to send OTP on login attempt:", emailErr);
      }
      res.status(403).json({ needsVerification: true, email: user.email, message: "Please verify your email. A new code has been sent." });
      return;
    }

    const sanitized = service.toAuthUser(user);
    const token = signAccessToken({ sub: sanitized.id, email: sanitized.email, role: sanitized.role });
    // Update last_login_at non-blocking
    pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]).catch(() => undefined);
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
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
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

    const answer = await requestGroqChat({ messages, temperature: 0.2, maxTokens: 220, reasoningEffort: "low" });

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

    const answer = await requestGroqChat({ messages, temperature: 0.35, maxTokens: 320, reasoningEffort: "medium" });
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

    const translatedText = await requestGroqChat({ messages, temperature: 0.1, maxTokens: 380, reasoningEffort: "low" });

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
  let tmpVideoPath: string | null = null;
  try {
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    const videoUrl = typeof req.body?.videoUrl === "string" ? req.body.videoUrl : undefined;
    const userId = req.auth?.sub;

    console.log(`[video-summary] incoming request: user=${userId || 'anonymous'} videoUrl=${videoUrl ? 'yes' : 'no'} file=${req.file ? req.file.originalname : 'none'} size=${req.file ? req.file.size : 0}`);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let transcript = "";
    let transcriptFetchError: string | null = null;
    let sourceType: "youtube" | "upload" = "youtube";
    let sourceReference: string | null = null;

    if (req.file) {
      // Write buffer to OS temp dir (writable on all platforms including Render)
      sourceType = "upload";
      sourceReference = req.file.originalname;
      const safeExt = path.extname(req.file.originalname).toLowerCase() || ".mp4";
      tmpVideoPath = path.join(os.tmpdir(), `yunafied_vid_${Date.now()}${safeExt}`);
      await fs.writeFile(tmpVideoPath, req.file.buffer);
      try {
        transcript = await transcribeUploadedVideoWithWhisper(tmpVideoPath);
      } catch (err) {
        console.error('[video-summary] Upload transcription failed:', err instanceof Error ? err.message : err);
        // Return a 502 with a helpful message rather than throwing to the global handler
        res.status(502).json({ message: 'Transcription of uploaded video failed.', details: err instanceof Error ? err.message : String(err) });
        return;
      }
    } else if (videoUrl) {
      sourceType = "youtube";
      sourceReference = videoUrl;
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
          const message = `Unable to process this YouTube video. Transcript fetch failed: ${transcriptFetchError || "Unknown error"}. Fallback transcription failed: ${fallbackError}`;
          console.error('[video-summary] YouTube transcription failed:', message);
          // Return a 502 Bad Gateway with actionable guidance instead of letting this become a 500
          res.status(502).json({ message });
          return;
        }
      }
    } else {
      res.status(400).json({ message: "Provide a video file or a YouTube URL." });
      return;
    }

    const structuredSummary = await summarizeTranscript({ transcript, context });

    // Persist to video_summaries table so user can access history
    const saved = await service.createVideoSummary({
      userId,
      sourceType,
      sourceReference,
      contextNote: context || null,
      generatedTitle: structuredSummary.title,
      summary: structuredSummary.summary,
      takeaways: structuredSummary.takeaways,
    });

    res.json({ ...structuredSummary, id: saved.id, createdAt: saved.createdAt });
  } catch (error) {
    next(error);
  } finally {
    if (tmpVideoPath) {
      await fs.unlink(tmpVideoPath).catch(() => undefined);
    }
  }
  },
);

const videoSummaryHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(10),
});

app.get("/api/ai/video-summaries", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const query = videoSummaryHistoryQuerySchema.parse(req.query);
    const result = await service.listVideoSummaries({ userId, page: query.page, pageSize: query.pageSize });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/ai/video-summaries/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const deleted = await service.deleteVideoSummary(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({ message: "Video summary not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

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
    const [assignments, submissions, schedules, announcements, readState, deleteRefs] = await Promise.all([
      service.listAssignments(),
      service.listSubmissionsForRole(requester),
      service.listSchedulesForRole(requester),
      service.listAnnouncements(),
      service.getNotificationReadState(userId),
      service.getNotificationDeleteRefs(userId),
    ]);

    const isRefRead = (id: string, createdAt: string): boolean => {
      if (readState.allReadAt && new Date(createdAt) <= readState.allReadAt) return true;
      return readState.readRefs.has(id);
    };

    type NotificationItem = {
      id: string;
      type: "assignment" | "submission" | "announcement" | "schedule" | "grade";
      title: string;
      message: string;
      priority: "low" | "medium" | "high";
      createdAt: string;
      actionView: string;
      isRead: boolean;
    };

    const now = new Date();
    const notificationRows: NotificationItem[] = [];

    for (const announcement of announcements.slice(0, 8)) {
      const id = `announcement:${announcement.id}`;
      notificationRows.push({
        id,
        type: "announcement",
        title: "New announcement",
        message: `${announcement.title} by ${announcement.postedByName}`,
        priority: "medium",
        createdAt: announcement.createdAt,
        actionView: "announcements",
        isRead: isRefRead(id, announcement.createdAt),
      });
    }

    if (role === "student") {
      const mySubmissionByAssignment = new Set(submissions.map((item) => item.assignmentId));

      for (const assignment of assignments) {
        const due = new Date(assignment.dueDate);
        const hoursUntilDue = (due.getTime() - now.getTime()) / 36e5;
        const submitted = mySubmissionByAssignment.has(assignment.id);

        if (!submitted && hoursUntilDue <= 72 && hoursUntilDue >= -24) {
          const id = `assignment-due:${assignment.id}`;
          notificationRows.push({
            id,
            type: "assignment",
            title: "Assignment due soon",
            message: `${assignment.title} is due on ${assignment.dueDate}.`,
            priority: hoursUntilDue <= 24 ? "high" : "medium",
            createdAt: assignment.createdAt,
            actionView: "assignments",
            isRead: isRefRead(id, assignment.createdAt),
          });
        }
      }

      for (const submission of submissions) {
        if (submission.grade) {
          const id = `grade:${submission.id}`;
          const createdAt = submission.gradedAt || submission.submittedAt;
          notificationRows.push({
            id,
            type: "grade",
            title: "Submission graded",
            message: `${submission.assignmentTitle}: grade ${submission.grade}`,
            priority: "medium",
            createdAt,
            actionView: "grades",
            isRead: isRefRead(id, createdAt),
          });
        }
      }
    } else {
      const ungraded = submissions.filter((item) => !item.grade);
      for (const submission of ungraded.slice(0, 12)) {
        const id = `submission:${submission.id}`;
        notificationRows.push({
          id,
          type: "submission",
          title: "New submission needs grading",
          message: `${submission.studentName} submitted ${submission.assignmentTitle}.`,
          priority: "high",
          createdAt: submission.submittedAt,
          actionView: "assignments",
          isRead: isRefRead(id, submission.submittedAt),
        });
      }
    }

    for (const schedule of schedules.slice(0, 12)) {
      if (schedule.status === "pending") {
        const id = `schedule-pending:${schedule.id}`;
        const createdAt = schedule.updatedAt || schedule.createdAt;
        notificationRows.push({
          id,
          type: "schedule",
          title: "Schedule request pending",
          message: `${schedule.title} on ${schedule.date} ${schedule.startTime}-${schedule.endTime}`,
          priority: "medium",
          createdAt,
          actionView: "schedule",
          isRead: isRefRead(id, createdAt),
        });
      }
    }

    notificationRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Filter out any synthetic/generated notifications the user has dismissed
    const visible = notificationRows.filter((r) => !deleteRefs.has(r.id));
    res.json(visible.slice(0, query.limit));
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
  firstName: z.string().min(2),
  middleName: z.string().optional(),
  lastName: z.string().min(2),
  role: z.enum(["teacher", "student"]),
  status: z.enum(["active", "inactive", "pending", "archived", "completed", "dropped"]).default("active"),
  profileImageUrl: z.string().url().nullable().optional(),
  profileImagePublicId: z.string().nullable().optional(),
  password: z.string().min(6),
});

app.post("/api/users", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    res.status(403).json({ message: "Manual user creation is disabled. Use Enrollment." });
    return;
    /*
    const payload = createUserSchema.parse(req.body);
    const exists = await service.findUserWithPasswordByEmail(payload.email);
    if (exists) {
      res.status(409).json({ message: "Email is already registered." });
      return;
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await service.createUser({
      email: payload.email,
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
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

    */
  } catch (error) {
    next(error);
  }
});

app.get("/api/student-records", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await service.listStudentRecords({ id: req.auth?.sub || "", role: req.auth?.role || "teacher" }));
  } catch (error) {
    next(error);
  }
});

const updateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  middleName: z.string().optional(),
  lastName: z.string().min(2),
  role: z.enum(["admin", "teacher", "student"]),
  status: z.enum(["active", "inactive", "pending", "archived", "completed", "dropped"]),
  profileImageUrl: z.string().url().nullable().optional(),
  profileImagePublicId: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

const changeUserStatusSchema = z.object({
  status: z.enum(["active", "inactive", "pending", "archived", "completed", "dropped"]),
  reason: z.string().max(1000).nullable().optional(),
  dropDate: z.string().date().nullable().optional(),
  actionTaken: z.string().max(1000).nullable().optional(),
  pullOutReason: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

app.put("/api/users/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = updateUserSchema.parse(req.body);
    const existing = await service.findUserWithPasswordById(req.params.id);
    if (!existing) { res.status(404).json({ message: "User not found." }); return; }
    if (payload.status === "dropped" && existing.status !== "dropped") {
      res.status(400).json({ message: "Use the Change Status action to mark a student as dropped and provide the required details." }); return;
    }
    if (existing.role === "admin" && (payload.role !== "admin" || payload.status === "archived")) {
      res.status(400).json({ message: "The designated Admin account cannot be demoted or archived." }); return;
    }
    if (payload.role === "admin" && existing.role !== "admin") {
      res.status(400).json({ message: "A second Admin account cannot be created." }); return;
    }
    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

    const updated = await service.updateUser(req.params.id, {
      email: payload.email,
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
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

app.patch("/api/users/:id/status", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = changeUserStatusSchema.parse(req.body);
    const changedById = req.auth?.sub;
    if (!changedById) { res.status(401).json({ message: "Unauthorized" }); return; }
    const target = await service.findUserWithPasswordById(req.params.id);
    if (!target) { res.status(404).json({ message: "User not found." }); return; }
    if (target.role === "admin" && payload.status !== "active") { res.status(400).json({ message: "The designated Admin account cannot have its status changed." }); return; }
    const updated = await service.changeUserStatus(req.params.id, changedById, payload);
    res.json(updated);
    clearBootstrapCache();
  } catch (error) { next(error); }
});

app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.auth?.sub === req.params.id) {
      res.status(400).json({ message: "You cannot delete your own account." });
      return;
    }

    const target = await service.findUserWithPasswordById(req.params.id);
    if (target?.role === "admin") {
      res.status(400).json({ message: "The designated Admin account cannot be archived." });
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

app.post("/api/assignments", requireAuth, requireRole("admin", "teacher"), learningMaterialUpload.fields([{ name: "attachmentFile", maxCount: 1 }, { name: "rubricFile", maxCount: 1 }]), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const payload = createAssignmentSchema.parse(body);
    const teacherId = req.auth?.sub;

    if (!teacherId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const attachmentFileObj = files?.attachmentFile?.[0];
    const rubricFileObj = files?.rubricFile?.[0];

    const attachmentFileName = attachmentFileObj ? attachmentFileObj.originalname : null;
    let attachmentUrl: string | null = null;
    if (attachmentFileObj) {
      const uploaded = await uploadDocumentBufferToCloudinary(attachmentFileObj);
      attachmentUrl = uploaded.secureUrl;
    }

    const rubricFileName = rubricFileObj ? rubricFileObj.originalname : null;
    let rubricUrl: string | null = null;
    if (rubricFileObj) {
      const uploaded = await uploadDocumentBufferToCloudinary(rubricFileObj);
      rubricUrl = uploaded.secureUrl;
    }

    const assignment = await service.createAssignment({ ...payload, teacherId, attachmentFileName, attachmentUrl, rubricFileName, rubricUrl });
    res.status(201).json(assignment);
    clearBootstrapCache();
  } catch (error) {
    next(error);
  }
});

const toggleCloseSchema = z.object({ isClosed: z.boolean() });

app.patch("/api/assignments/:id/toggle-close", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { isClosed } = toggleCloseSchema.parse(req.body);
    const assignment = await service.toggleAssignmentClosed(req.params.id, isClosed);
    res.json(assignment);
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
      let fileUrl: string | null = null;
      if (req.file) {
        const uploaded = await uploadDocumentBufferToCloudinary(req.file);
        fileUrl = uploaded.secureUrl;
      }

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

app.patch("/api/chats/:chatId/read", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requesterId = req.auth?.sub;
    if (!requesterId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    await service.markChatRead(req.params.chatId, requesterId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

const accountEnrollmentSchema = z.object({
  email: z.string().email(), firstName: z.string().min(2), middleName: z.string().optional(), lastName: z.string().min(2),
  role: z.enum(["teacher", "student"]), profileImageUrl: z.string().url().nullable().optional(), profileImagePublicId: z.string().nullable().optional(),
  studentId: z.string().uuid().optional(), teacherId: z.string().uuid().optional(), subject: z.string().min(2).max(200).optional(), tutorialGroup: z.string().max(120).optional(), gradeLevel: z.string().max(120).optional(), note: z.string().max(1000).optional(),
});

app.post("/api/enrollments/account", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const creatorId = req.auth?.sub;
    if (!creatorId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const payload = accountEnrollmentSchema.parse(req.body);
    const exists = await service.findUserWithPasswordByEmail(payload.email.trim().toLowerCase());
    if (exists) { res.status(409).json({ message: "Email is already registered." }); return; }
    const rawToken = randomBytes(32).toString("hex");
    const user = await service.createPendingUser({ ...payload, tokenHash: hashVerificationToken(rawToken), tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    const assignmentStudentId = payload.role === "student" ? user.id : payload.studentId;
    const assignmentTeacherId = payload.role === "teacher" ? user.id : payload.teacherId;
    if (payload.subject && assignmentStudentId && assignmentTeacherId) await service.createEnrollmentRecord({ studentId: assignmentStudentId, teacherId: assignmentTeacherId, subject: payload.subject, tutorialGroup: payload.tutorialGroup || null, gradeLevel: payload.gradeLevel || null, note: payload.note || null, createdById: creatorId });
    try { await sendVerificationLinkEmail(user.email, user.firstName, rawToken); } catch (emailErr) { console.error("[EMAIL] Failed to send account verification link:", emailErr); }
    clearBootstrapCache();
    res.status(201).json({ user, message: "Account enrolled. A verification link has been sent." });
  } catch (error) { next(error); }
});

app.post("/api/auth/resend-verification", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const user = await service.findUserWithPasswordById(userId);
    if (!user || user.status !== "pending") { res.status(400).json({ message: "Only pending accounts can receive a verification email." }); return; }
    const rawToken = randomBytes(32).toString("hex");
    await service.saveVerificationToken(user.id, hashVerificationToken(rawToken), new Date(Date.now() + 24 * 60 * 60 * 1000));
    await sendVerificationLinkEmail(user.email, user.first_name, rawToken);
    res.json({ message: "A new verification link has been sent." });
  } catch (error) { next(error); }
});

app.get("/api/auth/verify-account", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = z.string().min(32).parse(req.query.token);
    const user = await service.findUserByVerificationToken(hashVerificationToken(rawToken));
    if (!user || user.status !== "pending" || !user.verification_token_expires_at || new Date(user.verification_token_expires_at) < new Date()) { res.status(400).json({ message: "This verification link is invalid or expired." }); return; }
    res.json({ email: user.email, firstName: user.first_name, middleName: user.middle_name, lastName: user.last_name, role: user.role, token: rawToken });
  } catch (error) { next(error); }
});

app.post("/api/auth/complete-account-setup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = z.object({ token: z.string().min(32), firstName: z.string().min(2), middleName: z.string().optional(), lastName: z.string().min(2), password: z.string().min(6) }).parse(req.body);
    const user = await service.findUserByVerificationToken(hashVerificationToken(payload.token));
    if (!user || user.status !== "pending" || !user.verification_token_expires_at || new Date(user.verification_token_expires_at) < new Date()) { res.status(400).json({ message: "This verification link is invalid or expired." }); return; }
    const updated = await service.completeAccountSetup(user.id, { firstName: payload.firstName, middleName: payload.middleName, lastName: payload.lastName, passwordHash: await bcrypt.hash(payload.password, 10) });
    if (!updated) { res.status(400).json({ message: "This account has already been set up." }); return; }
    const accessToken = signAccessToken({ sub: updated.id, email: updated.email, role: updated.role });
    res.json({ token: accessToken, user: updated });
  } catch (error) { next(error); }
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
    const row = await service.updateEnrollmentRecord(req.params.id, { ...payload, changedById: req.auth?.sub || null });

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

      const uploaded = await uploadDocumentBufferToCloudinary(req.file);

      const row = await service.createLearningMaterial({
        title,
        description,
        subject,
        materialType: "file",
        resourceUrl: uploaded.secureUrl,
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

// ─── Meeting Room API (WebRTC Video Calls) ─────────────────────────────────────

const createMeetingSchema = z.object({
  scheduleId: z.string().uuid().nullable().optional(),
  studentId: z.string().uuid().nullable().optional(),
  studentName: z.string().max(200).nullable().optional(),
  scheduleTitle: z.string().max(200).nullable().optional(),
  scheduleDescription: z.string().max(2000).nullable().optional(),
});

const meetingSignalSchema = z.object({
  offer: z.record(z.unknown()).nullable().optional(),
  answer: z.record(z.unknown()).nullable().optional(),
  addIceCandidate: z.record(z.unknown()).optional(),
});

const meetingStatusSchema = z.object({
  status: z.enum(["active", "declined", "ended"]),
});

app.post("/api/meetings", requireAuth, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const payload = createMeetingSchema.parse(req.body);
    const teacher = await service.findUserWithPasswordById(userId);
    if (!teacher) {
      res.status(404).json({ message: "Teacher not found." });
      return;
    }

    // End any existing active calling rooms for this teacher before creating new one
    await pool.query(
      `UPDATE meeting_rooms SET status = 'ended', updated_at = NOW()
        WHERE teacher_id = $1 AND status IN ('calling', 'active')`,
      [userId],
    );

    const roomToken = randomBytes(24).toString("hex");

    const room = await service.createMeetingRoom({
      roomToken,
      scheduleId: payload.scheduleId || null,
      teacherId: userId,
      studentId: payload.studentId || null,
      teacherName: teacher.full_name,
      studentName: payload.studentName || null,
      scheduleTitle: payload.scheduleTitle || null,
      scheduleDescription: payload.scheduleDescription || null,
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
});

app.get("/api/meetings/incoming", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Disable caching for polling clients so they always receive the latest signal state
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const room = await service.getIncomingCallForStudent(userId);
    res.json(room || null);
  } catch (error) {
    next(error);
  }
});

// Return latest meeting rooms for a list of schedule IDs
app.post("/api/meetings/by-schedules", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

    const body = z.object({ scheduleIds: z.array(z.string()).min(1) }).parse(req.body);
    const rows = await service.getLatestMeetingsForSchedules(body.scheduleIds);

    // Only return rows related to the requesting user for privacy
    const filtered = rows.filter((r) => r.teacherId === userId || r.studentId === userId);

    // Map by scheduleId
    const map: Record<string, typeof rows[0] | null> = {};
    for (const id of body.scheduleIds) map[id] = null;
    for (const r of filtered) {
      if (r.scheduleId) map[r.scheduleId] = r;
    }

    res.json(map);
  } catch (error) {
    next(error);
  }
});

app.get("/api/meetings/:roomToken", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const room = await service.getMeetingRoom(req.params.roomToken);
    if (!room) {
      res.status(404).json({ message: "Meeting room not found." });
      return;
    }

    // Only teacher or assigned student can access the room
    if (room.teacherId !== userId && room.studentId !== userId) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    // Disable caching for polling clients so they always receive the latest signal state
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json(room);
  } catch (error) {
    next(error);
  }
});

app.post("/api/meetings/:roomToken/signal", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    const userRole = req.auth?.role;
    if (!userId || !userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const room = await service.getMeetingRoom(req.params.roomToken);
    if (!room) {
      res.status(404).json({ message: "Meeting room not found." });
      return;
    }

    if (room.teacherId !== userId && room.studentId !== userId) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    if (room.status === "ended" || room.status === "declined") {
      res.status(400).json({ message: "Meeting has ended." });
      return;
    }

    const payload = meetingSignalSchema.parse(req.body);

    // Log incoming signaling payloads for debugging (offer/answer/ice)
    try {
      console.info('[meeting:signal] user=%s role=%s room=%s payloadKeys=%s', userId, userRole, req.params.roomToken, Object.keys(payload).join(','));
    } catch (_e) {
      // ignore logging errors
    }
    const callerRole = room.teacherId === userId ? "teacher" : "student";

    const updated = await service.updateMeetingSignal(req.params.roomToken, callerRole, {
      offer: payload.offer,
      answer: payload.answer,
      addIceCandidate: payload.addIceCandidate,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/meetings/:roomToken/status", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const room = await service.getMeetingRoom(req.params.roomToken);
    if (!room) {
      res.status(404).json({ message: "Meeting room not found." });
      return;
    }

    if (room.teacherId !== userId && room.studentId !== userId) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    const payload = meetingStatusSchema.parse(req.body);

    // Only student can decline, anyone can set active or ended
    if (payload.status === "declined" && room.studentId !== userId) {
      res.status(403).json({ message: "Only the student can decline a call." });
      return;
    }

    const updated = await service.updateMeetingStatus(req.params.roomToken, payload.status);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ─── Notification Mark-Read / Delete ─────────────────────────────────────────

app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    await service.markNotificationRead(req.params.id, userId);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.patch("/api/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    await service.markAllNotificationsRead(userId);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.delete("/api/notifications/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const id = req.params.id;

    // Synthetic notifications use a composite id like "type:uuid" (eg "grade:...",
    // "announcement:...") and are not stored in the notifications table. Attempting
    // to DELETE them will cause Postgres to try casting the value to UUID and fail.
    // Treat deletes for synthetic notifications as a dismiss: record a delete-ref
    // so they will no longer be generated or shown to the user.
    if (id.includes(':')) {
      await service.addNotificationDeleteRef(id, userId);
      res.status(204).end();
      return;
    }

    const deleted = await service.deleteNotification(id, userId);
    if (!deleted) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Teacher Availability ─────────────────────────────────────────────────────

app.get("/api/teacher/availability", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.query.teacherId as string | undefined || req.auth?.sub;
    if (!teacherId) { res.status(400).json({ message: "teacherId required" }); return; }
    const blocks = await service.listAvailabilityByTeacher(teacherId);
    res.json(blocks);
  } catch (error) { next(error); }
});

app.post("/api/teacher/availability", requireAuth, requireRole("teacher", "admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.auth?.sub;
    if (!teacherId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const input = z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
    }).parse(req.body);
    const block = await service.createAvailabilityBlock(teacherId, input);
    res.status(201).json(block);
  } catch (error) { next(error); }
});

app.delete("/api/teacher/availability/:id", requireAuth, requireRole("teacher", "admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const teacherId = req.auth?.sub;
    if (!teacherId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const deleted = await service.deleteAvailabilityBlock(req.params.id, teacherId);
    if (!deleted) { res.status(404).json({ message: "Availability block not found." }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Milestones ───────────────────────────────────────────────────────────────

app.get("/api/milestones", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const targetId = (req.query.studentId as string) || (role === "student" ? userId : undefined);
    if (!targetId) { res.status(400).json({ message: "studentId required" }); return; }
    await service.initStudentMilestones(targetId);
    const milestones = await service.listMilestones(targetId);
    res.json(milestones);
  } catch (error) { next(error); }
});

// ─── Student Tasks ────────────────────────────────────────────────────────────

app.get("/api/student/tasks", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const tasks = await service.listStudentTasks(userId);
    res.json(tasks);
  } catch (error) { next(error); }
});

app.post("/api/student/tasks", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const input = z.object({
      title: z.string().min(1).max(255),
      dueDate: z.string().nullable().optional(),
      source: z.string().optional(),
      assignmentId: z.string().uuid().nullable().optional(),
    }).parse(req.body);
    const task = await service.createStudentTask(userId, input);
    res.status(201).json(task);
  } catch (error) { next(error); }
});

app.patch("/api/student/tasks/:id", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const input = z.object({
      title: z.string().min(1).max(255).optional(),
      dueDate: z.string().nullable().optional(),
      isCompleted: z.boolean().optional(),
    }).parse(req.body);
    const task = await service.updateStudentTask(req.params.id, userId, input);
    if (!task) { res.status(404).json({ message: "Task not found." }); return; }
    res.json(task);
  } catch (error) { next(error); }
});

app.delete("/api/student/tasks/:id", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const deleted = await service.deleteStudentTask(req.params.id, userId);
    if (!deleted) { res.status(404).json({ message: "Task not found." }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Badges & XP ─────────────────────────────────────────────────────────────

app.get("/api/badges", requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const badges = await service.listAllBadges();
    res.json(badges);
  } catch (error) { next(error); }
});

app.get("/api/student/badges", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const badges = await service.getStudentBadges(userId);
    res.json(badges);
  } catch (error) { next(error); }
});

app.get("/api/student/xp", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const xp = await service.getStudentXp(userId);
    res.json(xp);
  } catch (error) { next(error); }
});

app.get("/api/student/quests", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const rows = await service.listStudentQuests(userId);
    if (!rows.length) {
      const created = await service.generateDailyQuests(userId);
      res.json(created);
      return;
    }
    res.json(rows);
  } catch (error) { next(error); }
});

app.post("/api/student/quests/:id/claim", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const updated = await service.claimStudentQuest(userId, req.params.id);
    if (!updated) { res.status(404).json({ message: 'Quest not found.' }); return; }
    res.json(updated);
  } catch (error) { next(error); }
});

app.get("/api/store/items", requireAuth, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const items = await service.listStoreItems();
    res.json(items);
  } catch (error) { next(error); }
});

app.post("/api/store/purchase", requireAuth, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const code = typeof body.code === 'string' ? body.code : null;
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    if (!code) { res.status(400).json({ message: 'Missing item code.' }); return; }
    const purchase = await service.purchaseStoreItem(userId, code);
    res.status(201).json(purchase);
  } catch (error) { if (error instanceof Error) { res.status(400).json({ message: error.message }); return; } next(error); }
});

app.get('/api/student/store/purchases', requireAuth, requireRole('student'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const rows = await service.listStudentStorePurchases(userId);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/store/use', requireAuth, requireRole('student'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const code = typeof body.code === 'string' ? body.code : null;
    if (!code) { res.status(400).json({ message: 'Missing code' }); return; }
    const used = await service.useStoreItem(userId, code);
    res.status(201).json(used);
  } catch (error) { if (error instanceof Error) { res.status(400).json({ message: error.message }); return; } next(error); }
});

// ─── Vocabulary ───────────────────────────────────────────────────────────────

app.post("/api/translations/vocab", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const input = z.object({
      sourceText: z.string().min(1),
      translatedText: z.string().min(1),
      sourceLanguage: z.string().min(1),
      targetLanguage: z.string().min(1),
    }).parse(req.body);
    const item = await service.saveVocabItem(userId, input);
    res.status(201).json(item);
  } catch (error) { next(error); }
});

app.get("/api/translations/vocab", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const items = await service.listVocabItems(userId);
    res.json(items);
  } catch (error) { next(error); }
});

app.delete("/api/translations/vocab/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
    const deleted = await service.deleteVocabItem(req.params.id, userId);
    if (!deleted) { res.status(404).json({ message: "Vocab item not found." }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Announcements Edit / Delete ──────────────────────────────────────────────

app.put("/api/announcements/:id", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) { res.status(401).json({ message: "Unauthorized" }); return; }
    const input = z.object({ title: z.string().min(1), content: z.string().min(1) }).parse(req.body);
    const updated = await service.updateAnnouncement(req.params.id, userId, role as "admin" | "teacher", input);
    if (!updated) { res.status(404).json({ message: "Announcement not found or permission denied." }); return; }
    res.json(updated);
  } catch (error) { next(error); }
});

app.delete("/api/announcements/:id", requireAuth, requireRole("admin", "teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.sub;
    const role = req.auth?.role;
    if (!userId || !role) { res.status(401).json({ message: "Unauthorized" }); return; }
    const deleted = await service.softDeleteAnnouncement(req.params.id, userId, role as "admin" | "teacher");
    if (!deleted) { res.status(404).json({ message: "Announcement not found or permission denied." }); return; }
    res.status(204).end();
  } catch (error) { next(error); }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

const auditLogsQuerySchema = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

app.get("/api/admin/audit-logs", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = auditLogsQuerySchema.parse(req.query);
    const result = await service.listAuditLogs(filters);
    res.json(result);
  } catch (error) { next(error); }
});

app.get("/api/admin/meeting-history", requireAuth, requireRole("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await service.listAllMeetingRoomsAdmin();
    res.json(rooms);
  } catch (error) { next(error); }
});

const adminAnalyticsQuerySchema = z.object({
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  status: z.string().optional(),
});

function materiallyDifferent(previous: unknown, current: unknown): boolean {
  if (!Array.isArray(previous) || !Array.isArray(current) || previous.length !== current.length) return true;
  const oldRows = previous as Array<Record<string, unknown>>;
  const newRows = current as Array<Record<string, unknown>>;
  for (let index = 0; index < newRows.length; index += 1) {
    const oldRow = oldRows[index];
    const newRow = newRows[index];
    if (!oldRow || !newRow || Object.keys(oldRow).some((key) => typeof oldRow[key] !== 'number' && oldRow[key] !== newRow[key])) return true;
    for (const key of Object.keys(newRow)) {
      if (typeof newRow[key] === 'number') {
        const oldValue = Number(oldRow[key] || 0);
        const newValue = Number(newRow[key] || 0);
        if (Math.abs(newValue - oldValue) > Math.max(3, Math.abs(oldValue) * 0.2)) return true;
      }
    }
  }
  return false;
}

app.get("/api/admin/analytics", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = adminAnalyticsQuerySchema.parse(req.query);
    const analytics = await service.getFilteredAdminAnalytics(filters);
    const performanceGraphs = await service.getAdminPerformanceGraphs();
    const snapshot = { ...analytics, interpretation: undefined, interpretationGeneratedAt: undefined };
    const graphInputs: Record<string, unknown> = {
      enrollmentTrends: analytics.enrollmentTrends || analytics.monthlySessionCounts,
      gradeDistribution: analytics.gradeDistribution,
      monthlySessions: analytics.monthlySessionCounts,
      teacherActivity: analytics.teacherActivity,
      studentProgress: analytics.studentProgress || analytics.topStudents,
      performanceAnalytics: [
        { metric: "submissions", value: analytics.totalSubmissions },
        { metric: "sessions", value: analytics.totalSessions },
        { metric: "students", value: analytics.totalStudents },
      ],
      ...performanceGraphs,
      performanceGradeDistribution: analytics.gradeDistribution,
      performanceStudentProgress: analytics.studentProgress || analytics.topStudents,
    };
    const interpretations: Record<string, { text: string; generatedAt: string | null }> = {};
    const missing: Record<string, unknown> = {};
    for (const [graphKey, graphData] of Object.entries(graphInputs)) {
      if (!Array.isArray(graphData) || graphData.length === 0) {
        interpretations[graphKey] = { text: "No data is available for this period.", generatedAt: null };
        continue;
      }
      const fingerprint = createHash("sha256").update(JSON.stringify({ graphKey, filters, graphData })).digest("hex");
      let saved = await service.getAdminDashboardInterpretation(fingerprint);
      if (!saved) {
        const latest = await service.getLatestAdminDashboardInterpretation(graphKey);
        const previousData = latest && typeof latest.snapshot === 'object' && latest.snapshot !== null ? (latest.snapshot as { graphData?: unknown }).graphData : null;
        if (latest && !materiallyDifferent(previousData, graphData)) {
          saved = await service.saveAdminDashboardInterpretation({ fingerprint, filters, snapshot: { graphKey, graphData }, interpretation: latest.interpretation });
        } else {
          missing[graphKey] = graphData;
        }
      }
      if (saved) interpretations[graphKey] = { text: saved.interpretation, generatedAt: saved.createdAt };
    }
    if (Object.keys(missing).length > 0) {
      const answer = await requestGroqChat({
        messages: [
          { role: "system", content: "You interpret multiple Admin dashboard graphs for YUNAfied. Return valid JSON only, with exactly one property for each graph key. Each value must be only 1 or 2 short sentences based strictly on that graph's data. Mention the most important trend, comparison, or action. Never invent facts, headings, bullets, or unsupported percentages." },
          { role: "user", content: JSON.stringify({ filters, graphs: missing }) },
        ],
        temperature: 0.2,
        maxTokens: 360,
        reasoningEffort: "low",
      });
      const generated = parseFirstJsonObject(answer) as Record<string, unknown>;
      for (const [graphKey, graphData] of Object.entries(missing)) {
        const text = typeof generated?.[graphKey] === 'string' ? generated[graphKey] as string : "The graph shows the current distribution of the available data.";
        const fingerprint = createHash("sha256").update(JSON.stringify({ graphKey, filters, graphData })).digest("hex");
        const saved = await service.saveAdminDashboardInterpretation({ fingerprint, filters, snapshot: { graphKey, graphData }, interpretation: text });
        interpretations[graphKey] = { text: saved.interpretation, generatedAt: saved.createdAt };
      }
    }
    res.json({ ...analytics, interpretation: undefined, interpretationGeneratedAt: undefined, interpretations, filters });
  } catch (error) { next(error); }
});

const csvImportUpload = multer({ storage: memStorage, limits: { fileSize: 2 * 1024 * 1024 } });

app.post(
  "/api/admin/users/import-csv",
  requireAuth,
  requireRole("admin"),
  csvImportUpload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      res.status(403).json({ message: "CSV user import is disabled. Use Enrollment." });
      return;
      /*
      const userId = req.auth?.sub;
      if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }
      if (!req.file) { res.status(400).json({ message: "No file uploaded." }); return; }

      const csvText = req.file.buffer.toString("utf-8");
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { res.status(400).json({ message: "CSV must have at least one data row." }); return; }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          firstName: cols[headers.indexOf("first_name")] || "",
          lastName: cols[headers.indexOf("last_name")] || "",
          email: cols[headers.indexOf("email")] || "",
          role: cols[headers.indexOf("role")] || "",
          password: cols[headers.indexOf("password")] || "",
        };
      });

      const result = await service.importUsersFromCsv(rows, userId);
      res.json(result); */
    } catch (error) { next(error); }
  },
);

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

// Serve frontend for all non-API routes (SPA fallback)
app.get("*", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/index.html"));
});

async function start(): Promise<void> {
  await testDatabaseConnection();
  // Ensure notifications table exists (idempotent, handles un-migrated DBs)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      action_view TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch(() => { /* table may already exist */ });
  // Ensure rubric columns exist on assignments
  await pool.query(`
    ALTER TABLE assignments
      ADD COLUMN IF NOT EXISTS rubric_file_name TEXT,
      ADD COLUMN IF NOT EXISTS rubric_url TEXT
  `).catch(() => {});
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});

// Global handlers to log unexpected crashes and promise rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err instanceof Error ? err.stack || err.message : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason instanceof Error ? reason.stack || reason.message : reason);
});
