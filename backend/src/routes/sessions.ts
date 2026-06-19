import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/index.js';
import { pcs, members, sessions, transactions, saldoLedgers, activityLogs } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { isNightPackageTimeValid, getPriceDetails, generateTrxNumber } from '../utils/pricing.js';

export const sessionsRoute = new Hono();
sessionsRoute.use('*', requireAuth);

const startSessionSchema = z.object({
  pcId: z.number().int().positive(),
  memberId: z.number().int().positive().optional(),
  guestName: z.string().optional(),
  priceId: z.number().int().positive(),
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'saldo']),
});

sessionsRoute.post('/', requireRole('admin'), zValidator('json', startSessionSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');

  if (!data.memberId && !data.guestName) {
    return c.json({ error: 'Either memberId or guestName is required' }, 400);
  }

  // Transaction block needed here, but drizzle supports transaction with postgres
  // We'll use simple sequential logic and handle errors (for production, use db.transaction)
  
  // 1. Check PC availability
  const pcRes = await db.select().from(pcs).where(eq(pcs.id, data.pcId));
  if (pcRes.length === 0 || pcRes[0].status !== 'available') {
    return c.json({ error: 'PC is not available' }, 400);
  }

  // 2. Get Price Rule
  const priceRule = await getPriceDetails(data.priceId);
  if (!priceRule) return c.json({ error: 'Invalid price ID' }, 400);

  if (priceRule.isNightPackage && !isNightPackageTimeValid()) {
    return c.json({ error: 'Night package is only available from 22:00 to 05:00' }, 400);
  }

  // 3. Determine actual price based on member or non-member
  const isMember = !!data.memberId;
  const unitPrice = isMember ? Number(priceRule.priceMember) : Number(priceRule.priceNonMember);
  
  // 4. Handle Payment & Saldo
  let finalPaymentMethod = data.paymentMethod;
  let cashRequired = unitPrice;

  if (isMember && finalPaymentMethod === 'saldo') {
    // Check member's current saldo
    const saldoRes = await db.select({ total: sql<number>`sum(amount)` })
      .from(saldoLedgers).where(eq(saldoLedgers.memberId, data.memberId!));
    
    const currentSaldo = saldoRes[0]?.total || 0;
    
    if (currentSaldo < unitPrice) {
      // Partial payment logic (mixed)
      return c.json({ 
        error: 'Insufficient saldo for this package',
        required: unitPrice,
        currentSaldo: currentSaldo,
        shortfall: unitPrice - currentSaldo
      }, 402); // 402 Payment Required indicating shortfall
    }
    cashRequired = 0; // Fully paid by saldo
  }

  // 5. Calculate Timestamps
  const now = new Date();
  const durationMs = priceRule.durationMinutes * 60 * 1000;
  const endTime = new Date(now.getTime() + durationMs);

  // 6. Execute DB Inserts
  return await db.transaction(async (tx) => {
    // Update PC Status
    await tx.update(pcs).set({ status: 'active' }).where(eq(pcs.id, data.pcId));

    // Create Session
    const newSession = await tx.insert(sessions).values({
      pcId: data.pcId,
      memberId: data.memberId || null,
      guestName: data.guestName || null,
      startTime: now,
      durationMinutes: priceRule.durationMinutes,
      endTime: endTime,
      status: 'running',
    }).returning();

    const session = newSession[0];

    // Create Transaction
    const newTrx = await tx.insert(transactions).values({
      trxNumber: generateTrxNumber(),
      sessionId: session.id,
      type: 'session',
      paymentMethod: finalPaymentMethod,
      totalAmount: unitPrice.toString(),
      itemPriceSnapshot: {
        unitPrice: unitPrice,
        packageType: priceRule.packageName,
        durationMinutes: priceRule.durationMinutes,
        customerType: isMember ? 'member' : 'non-member'
      },
      operatorId: parseInt(user.sub)
    }).returning();

    // Deduct Saldo if needed
    if (finalPaymentMethod === 'saldo' && isMember) {
      await tx.insert(saldoLedgers).values({
        memberId: data.memberId!,
        amount: (-unitPrice).toString(),
        transactionRefId: newTrx[0].id
      });
    }

    // Create Activity Log
    await tx.insert(activityLogs).values({
      operatorId: parseInt(user.sub),
      action: 'start_session',
      entityType: 'session',
      entityId: session.id,
      metadata: { pcId: data.pcId, memberId: data.memberId, guestName: data.guestName }
    });

    return c.json({ message: 'Session started', session, transaction: newTrx[0] }, 201);
  });
});

// GET active sessions
sessionsRoute.get('/active', async (c) => {
  const activeSessions = await db.select().from(sessions).where(eq(sessions.status, 'running'));
  return c.json(activeSessions);
});

// END Session
sessionsRoute.post('/:id/end', requireRole('admin'), async (c) => {
  const sessionId = parseInt(c.req.param('id'));
  const user = c.get('user');

  return await db.transaction(async (tx) => {
    const sessionRes = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    if (sessionRes.length === 0) return c.json({ error: 'Session not found' }, 404);
    
    const session = sessionRes[0];
    if (session.status === 'completed') return c.json({ error: 'Session already completed' }, 400);

    // Prevent ending within 60 seconds of start
    const now = new Date();
    if (now.getTime() - session.startTime.getTime() < 60000) {
      return c.json({ error: 'Cannot end session within the first 60 seconds' }, 400);
    }

    // End session early
    await tx.update(sessions).set({ status: 'completed', endTime: now }).where(eq(sessions.id, sessionId));
    await tx.update(pcs).set({ status: 'available' }).where(eq(pcs.id, session.pcId));

    await tx.insert(activityLogs).values({
      operatorId: parseInt(user.sub),
      action: 'end_session',
      entityType: 'session',
      entityId: sessionId,
      metadata: { pcId: session.pcId, endedEarly: true }
    });

    return c.json({ message: 'Session ended successfully' });
  });
});

// ADD Time
const addTimeSchema = z.object({
  priceId: z.number().int().positive(),
  paymentMethod: z.enum(['cash', 'qris', 'transfer', 'saldo']),
});

sessionsRoute.post('/:id/add-time', requireRole('admin'), zValidator('json', addTimeSchema), async (c) => {
  const sessionId = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const user = c.get('user');

  return await db.transaction(async (tx) => {
    const sessionRes = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    if (sessionRes.length === 0) return c.json({ error: 'Session not found' }, 404);
    const session = sessionRes[0];

    if (session.status !== 'running') return c.json({ error: 'Cannot add time to a completed session' }, 400);

    const priceRule = await getPriceDetails(data.priceId);
    if (!priceRule) return c.json({ error: 'Invalid price ID' }, 400);

    const isMember = !!session.memberId;
    const unitPrice = isMember ? Number(priceRule.priceMember) : Number(priceRule.priceNonMember);
    
    let finalPaymentMethod = data.paymentMethod;

    if (isMember && finalPaymentMethod === 'saldo') {
      const saldoRes = await tx.select({ total: sql<number>`sum(amount)` })
        .from(saldoLedgers).where(eq(saldoLedgers.memberId, session.memberId!));
      const currentSaldo = saldoRes[0]?.total || 0;
      
      if (currentSaldo < unitPrice) {
        return c.json({ error: 'Insufficient saldo', required: unitPrice, shortfall: unitPrice - currentSaldo }, 402);
      }
    }

    // Update Session
    const durationMs = priceRule.durationMinutes * 60 * 1000;
    const newEndTime = new Date(session.endTime.getTime() + durationMs);
    const newDuration = session.durationMinutes + priceRule.durationMinutes;

    await tx.update(sessions)
      .set({ endTime: newEndTime, durationMinutes: newDuration })
      .where(eq(sessions.id, sessionId));

    // Create Transaction
    const newTrx = await tx.insert(transactions).values({
      trxNumber: generateTrxNumber(),
      sessionId: session.id,
      type: 'add_time',
      paymentMethod: finalPaymentMethod,
      totalAmount: unitPrice.toString(),
      itemPriceSnapshot: {
        unitPrice: unitPrice,
        packageType: priceRule.packageName,
        durationMinutes: priceRule.durationMinutes,
        customerType: isMember ? 'member' : 'non-member'
      },
      operatorId: parseInt(user.sub)
    }).returning();

    // Deduct Saldo
    if (finalPaymentMethod === 'saldo' && isMember) {
      await tx.insert(saldoLedgers).values({
        memberId: session.memberId!,
        amount: (-unitPrice).toString(),
        transactionRefId: newTrx[0].id
      });
    }

    await tx.insert(activityLogs).values({
      operatorId: parseInt(user.sub),
      action: 'add_time',
      entityType: 'session',
      entityId: sessionId,
      metadata: { addedMinutes: priceRule.durationMinutes, newEndTime }
    });

    return c.json({ message: 'Time added successfully', newEndTime });
  });
});

// Transfer Session
const transferSchema = z.object({
  targetPcId: z.number().int().positive(),
});

sessionsRoute.post('/:id/transfer', requireRole('admin'), zValidator('json', transferSchema), async (c) => {
  const sessionId = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const user = c.get('user');

  return await db.transaction(async (tx) => {
    const sessionRes = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
    if (sessionRes.length === 0) return c.json({ error: 'Session not found' }, 404);
    const session = sessionRes[0];

    if (session.status !== 'running') return c.json({ error: 'Cannot transfer a completed session' }, 400);

    const targetPcRes = await tx.select().from(pcs).where(eq(pcs.id, data.targetPcId));
    if (targetPcRes.length === 0 || targetPcRes[0].status !== 'available') {
      return c.json({ error: 'Target PC is not available' }, 400);
    }

    // Update PCs and Session
    await tx.update(pcs).set({ status: 'available' }).where(eq(pcs.id, session.pcId));
    await tx.update(pcs).set({ status: 'active' }).where(eq(pcs.id, data.targetPcId));
    await tx.update(sessions).set({ pcId: data.targetPcId }).where(eq(sessions.id, sessionId));

    await tx.insert(activityLogs).values({
      operatorId: parseInt(user.sub),
      action: 'transfer_session',
      entityType: 'session',
      entityId: sessionId,
      metadata: { fromPcId: session.pcId, toPcId: data.targetPcId }
    });

    return c.json({ message: 'Session transferred successfully' });
  });
});
