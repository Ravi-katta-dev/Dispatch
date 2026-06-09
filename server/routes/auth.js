import { Router } from "express";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "../store/db.js";
import { signToken } from "../middleware/auth.js";

const router = Router();

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e));
}

// POST /api/auth/signup
// Body: { email, password }
router.post("/signup", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!validEmail(email)) return res.status(400).json({ error: "Valid email required" });
  if (!password || password.length < 8) return res.status(400).json({ error: "Password min 8 chars" });

  const existing = await findUserByEmail(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const id = await createUser(email.toLowerCase(), hash);

  const token = signToken({ id, email: email.toLowerCase() });
  res.status(201).json({ token, user: { id, email: email.toLowerCase() } });
});

// POST /api/auth/login
// Body: { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await findUserByEmail(email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
