import jwt from "jsonwebtoken";

const DEV_SECRET = "dispatch-dev-secret-change-in-prod";

export function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  return DEV_SECRET;
}

// Attach decoded user to req.user if valid token present.
// Does NOT reject — routes decide if auth is required.
export function attachUser(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), getJwtSecret());
    } catch {
      req.user = null;
    }
  }
  next();
}

// Hard-require auth — returns 401 if no valid token
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}
