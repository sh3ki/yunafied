import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/models.js";
import { pool } from "../lib/db.js";

const jwtSecret = process.env.JWT_SECRET || "yunafied-dev-secret";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: JwtPayload;
  file?: Express.Multer.File;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: "12h" });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing authorization token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;
    req.auth = payload;
    attachMutationAudit(req, res);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

function attachMutationAudit(req: AuthenticatedRequest, res: Response): void {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || req.path === "/api/admin/audit-logs/print") return;
  res.on("finish", () => {
    if (res.statusCode < 400 && req.auth) {
      const action = `${req.method}_${req.path.replace(/^\/api\//, "").replace(/[/:]+/g, "_").replace(/_+$/, "").toUpperCase()}`.slice(0, 120);
      const entityType = req.path.split("/").filter(Boolean)[1] || "system";
      void pool.query(`INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [req.auth.sub, req.auth.email, req.auth.role, action, entityType, req.params.id || null, req.ip]).catch((error) => console.error("[audit_log] request insert failed:", error));
    }
  });
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
}
