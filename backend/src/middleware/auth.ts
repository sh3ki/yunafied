import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/models.js";

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
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
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
