import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { prices } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const pricesRoute = new Hono();

pricesRoute.use('*', requireAuth);

const priceSchema = z.object({
  packageName: z.string().min(1),
  durationMinutes: z.number().int().min(1),
  priceMember: z.number().min(1, 'Harga member harus lebih dari 0'),
  priceNonMember: z.number().min(1, 'Harga non-member harus lebih dari 0'),
  isNightPackage: z.boolean().default(false),
});

// GET all prices
pricesRoute.get('/', async (c) => {
  const allPrices = await db.select().from(prices);
  return c.json(allPrices);
});

// POST new price rule
pricesRoute.post('/', requireRole('admin'), zValidator('json', priceSchema), async (c) => {
  const data = c.req.valid('json');
  // Need to handle decimal conversion if we receive numbers from the client
  const priceData = {
    ...data,
    priceMember: data.priceMember.toString(),
    priceNonMember: data.priceNonMember.toString(),
  };

  const newPrice = await db.insert(prices).values(priceData).returning();
  return c.json(newPrice[0], 201);
});

// PUT update price rule
const updatePriceSchema = priceSchema.partial();

pricesRoute.put('/:id', requireRole('admin'), zValidator('json', updatePriceSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');

  const updateData: any = { ...data };
  if (data.priceMember !== undefined) updateData.priceMember = data.priceMember.toString();
  if (data.priceNonMember !== undefined) updateData.priceNonMember = data.priceNonMember.toString();

  const updated = await db.update(prices).set(updateData).where(eq(prices.id, id)).returning();
  if (updated.length === 0) return c.json({ error: 'Price rule not found' }, 404);

  return c.json(updated[0]);
});

// DELETE price rule
pricesRoute.delete('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  
  const deleted = await db.delete(prices).where(eq(prices.id, id)).returning();
  if (deleted.length === 0) return c.json({ error: 'Price rule not found' }, 404);

  return c.json({ message: 'Price rule deleted successfully' });
});
