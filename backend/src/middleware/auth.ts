import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';

// Extend Hono context to provide typed user payload
export interface JwtUser {
  sub: string;
  username: string;
  role: 'admin' | 'owner';
  exp: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtUser;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    token = getCookie(c, 'auth_token');
  }

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = (await verify(token, process.env.JWT_SECRET!, 'HS256')) as unknown as JwtUser;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export const requireRole = (role: 'admin' | 'owner') => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== role) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });
};
