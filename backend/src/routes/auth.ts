import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign, verify } from 'hono/jwt';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { setCookie, deleteCookie } from 'hono/cookie';

export const authRoute = new Hono();

// Simple in-memory rate limiter for login
const loginAttempts = new Map<string, { count: number, lockedUntil: number | null }>();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

authRoute.post('/login', zValidator('json', loginSchema), async (c) => {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: null };
  
  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    return c.json({ error: 'Too many failed attempts. Try again later.' }, 429);
  }

  const { username, password } = c.req.valid('json');

  const userRes = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = userRes[0];

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
    }
    loginAttempts.set(ip, attempt);
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Reset attempts on success
  loginAttempts.delete(ip);

  const payload = {
    sub: user.id.toString(),
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes
  };

  const secret = process.env.JWT_SECRET!;
  const token = await sign(payload, secret);

  // In a real app, store a refresh token in the DB and send via httpOnly cookie
  // For this demo we'll just send the access token
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return c.json({
    message: 'Login successful',
    token, // <-- return token so frontend can store it
    user: { id: user.id, username: user.username, role: user.role }
  });
});

authRoute.post('/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Logged out successfully' });
});

// Setup Initial User (Development only)
authRoute.post('/setup-dev', async (c) => {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) return c.json({ message: 'Already setup' });

  const hash = bcrypt.hashSync('admin123', 10);
  await db.insert(users).values({
    username: 'admin',
    passwordHash: hash,
    role: 'admin'
  });

  const ownerHash = bcrypt.hashSync('owner123', 10);
  await db.insert(users).values({
    username: 'owner',
    passwordHash: ownerHash,
    role: 'owner'
  });

  return c.json({ message: 'Dev users created: admin/admin123 and owner/owner123' });
});
