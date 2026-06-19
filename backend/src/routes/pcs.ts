import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { pcs } from '../db/schema.js';
import { eq, isNull, and } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const pcsRoute = new Hono();

// Apply auth to all pc routes
pcsRoute.use('*', requireAuth);

const pcSchema = z.object({
  pcCode: z.string().min(1),
  aliasName: z.string().optional(),
  notes: z.string().optional(),
});

// GET all non-deleted PCs (optional ?status= filter)
pcsRoute.get('/', async (c) => {
  const status = c.req.query('status');
  const condition = status
    ? and(isNull(pcs.deletedAt), eq(pcs.status, status))
    : isNull(pcs.deletedAt);
  const allPcs = await db.select().from(pcs).where(condition);
  return c.json(allPcs);
});

// POST new PC
pcsRoute.post('/', requireRole('admin'), zValidator('json', pcSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const newPc = await db.insert(pcs).values(data).returning();
    return c.json(newPc[0], 201);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation in pg
      return c.json({ error: 'Kode PC sudah digunakan. Gunakan kode yang berbeda.' }, 400);
    }
    return c.json({ error: 'Terjadi kesalahan di server. Coba lagi.' }, 500);
  }
});

// PUT update PC details or status
const updatePcSchema = z.object({
  aliasName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['available', 'active', 'maintenance']).optional(),
});

pcsRoute.put('/:id', requireRole('admin'), zValidator('json', updatePcSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');

  const updated = await db.update(pcs).set(data).where(eq(pcs.id, id)).returning();
  if (updated.length === 0) return c.json({ error: 'PC not found' }, 404);

  return c.json(updated[0]);
});

// DELETE (soft delete) PC
pcsRoute.delete('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  
  // TODO: Check if PC has active session before deleting
  
  const deleted = await db.update(pcs).set({ deletedAt: new Date() }).where(eq(pcs.id, id)).returning();
  if (deleted.length === 0) return c.json({ error: 'PC not found' }, 404);

  return c.json({ message: 'PC deleted successfully' });
});
