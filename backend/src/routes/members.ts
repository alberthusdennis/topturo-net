import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { members, saldoLedgers, transactions, activityLogs } from '../db/schema.js';
import { eq, isNull, ilike, or, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { generateTrxNumber } from '../utils/pricing.js';

export const membersRoute = new Hono();

membersRoute.use('*', requireAuth);

const memberSchema = z.object({
  name: z.string().min(2),
  phoneNumber: z.string().regex(/^(\+62|08)[0-9]{8,13}$/, "Invalid Indonesian phone number"),
});

// GET all non-deleted members (with optional ?search= and saldo)
membersRoute.get('/', async (c) => {
  const search = c.req.query('search');

  const baseQuery = db.select({
    id: members.id,
    name: members.name,
    phoneNumber: members.phoneNumber,
    status: members.status,
    createdAt: members.createdAt,
    saldo: sql<number>`coalesce((select sum(amount::numeric) from saldo_ledgers where member_id = ${members.id}), 0)`,
  }).from(members);

  const allMembers = search
    ? await baseQuery.where(isNull(members.deletedAt))
        .then(rows => rows.filter(m =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.phoneNumber.includes(search)
        ))
    : await baseQuery.where(isNull(members.deletedAt));

  return c.json(allMembers);
});

// POST new member
membersRoute.post('/', requireRole('admin'), zValidator('json', memberSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const newMember = await db.insert(members).values(data).returning();
    return c.json(newMember[0], 201);
  } catch (error: any) {
    if (error.code === '23505') { // unique violation in pg
      return c.json({ error: 'Phone number already registered' }, 400);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// PUT update member
const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNumber: z.string().regex(/^(\+62|08)[0-9]{8,13}$/).optional(),
  status: z.enum(['active', 'blocked']).optional(),
});

membersRoute.put('/:id', requireRole('admin'), zValidator('json', updateMemberSchema), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');

  try {
    const updated = await db.update(members).set(data).where(eq(members.id, id)).returning();
    if (updated.length === 0) return c.json({ error: 'Member not found' }, 404);
    return c.json(updated[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return c.json({ error: 'Phone number already registered' }, 400);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// DELETE (soft delete) member
membersRoute.delete('/:id', requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'));
  
  // TODO: Check for active session before deleting
  
  const deleted = await db.update(members).set({ deletedAt: new Date(), status: 'blocked' }).where(eq(members.id, id)).returning();
  if (deleted.length === 0) return c.json({ error: 'Member not found' }, 404);

  return c.json({ message: 'Member deleted successfully' });
});

// TOP UP Saldo
const topupSchema = z.object({
  amount: z.number().int().min(50000).max(1000000),
  paymentMethod: z.enum(['cash', 'qris', 'transfer']),
});

membersRoute.post('/:id/topup', requireRole('admin'), zValidator('json', topupSchema), async (c) => {
  const memberId = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const user = c.get('user');

  return await db.transaction(async (tx) => {
    const memberRes = await tx.select().from(members).where(eq(members.id, memberId));
    if (memberRes.length === 0) return c.json({ error: 'Member not found' }, 404);

    // Create Transaction
    const newTrx = await tx.insert(transactions).values({
      trxNumber: generateTrxNumber(),
      sessionId: null,
      type: 'top_up',
      paymentMethod: data.paymentMethod,
      totalAmount: data.amount.toString(),
      itemPriceSnapshot: {
        unitPrice: data.amount,
        packageType: 'Top Up',
        durationMinutes: 0,
        customerType: 'member'
      },
      operatorId: parseInt(user.sub)
    }).returning();

    // Insert into Saldo Ledger
    await tx.insert(saldoLedgers).values({
      memberId: memberId,
      amount: data.amount.toString(),
      transactionRefId: newTrx[0].id
    });

    // Create Activity Log
    await tx.insert(activityLogs).values({
      operatorId: parseInt(user.sub),
      action: 'top_up',
      entityType: 'member',
      entityId: memberId,
      metadata: { amount: data.amount, paymentMethod: data.paymentMethod }
    });

    return c.json({ message: 'Top up successful', transaction: newTrx[0] });
  });
});
