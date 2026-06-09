import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dispatch-dev-secret-change-in-prod";

// Attach decoded user to req.user if valid token present.
// Does NOT reject — routes decide if auth is required.
export function attachUser(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), SECRET);
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
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}
