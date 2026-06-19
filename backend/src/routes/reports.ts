import { Hono } from 'hono';
import { db } from '../db/index.js';
import { transactions, activityLogs, users, sessions, pcs, members } from '../db/schema.js';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

export const reportsRoute = new Hono();
reportsRoute.use('*', requireAuth);

/**
 * Parse tanggal dari query param. Jika tidak ada, gunakan hari ini.
 * startDate: awal hari (00:00:00)
 * endDate: akhir hari (23:59:59.999)
 */
function parseDateRange(startDateStr?: string, endDateStr?: string) {
  const now = new Date();

  let start: Date;
  let end: Date;

  if (startDateStr) {
    start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  }

  if (endDateStr) {
    end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

// GET /api/reports/shift?startDate=2024-06-01&endDate=2024-06-10
reportsRoute.get('/shift', async (c) => {
  const { startDate, endDate } = c.req.query();
  const { start, end } = parseDateRange(startDate, endDate);

  const byMethod = await db.select({
    paymentMethod: transactions.paymentMethod,
    total: sql<number>`sum(${transactions.totalAmount}::numeric)`,
    count: sql<number>`count(*)`,
  })
    .from(transactions)
    .where(and(
      gte(transactions.createdAt, start),
      lte(transactions.createdAt, end),
    ))
    .groupBy(transactions.paymentMethod);

  const grandTotal = byMethod.reduce((acc, row) => acc + Number(row.total), 0);
  const totalSessions = byMethod.reduce((acc, row) => acc + Number(row.count), 0);

  return c.json({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    byMethod: byMethod.map(r => ({
      paymentMethod: r.paymentMethod,
      total: Number(r.total),
      count: Number(r.count),
    })),
    grandTotal,
    totalSessions,
  });
});

// GET /api/reports/transactions?startDate=...&endDate=... — daftar transaksi detail
reportsRoute.get('/transactions', async (c) => {
  const { startDate, endDate } = c.req.query();
  const { start, end } = parseDateRange(startDate, endDate);

  const rows = await db.select({
    id: transactions.id,
    trxNumber: transactions.trxNumber,
    type: transactions.type,
    paymentMethod: transactions.paymentMethod,
    totalAmount: transactions.totalAmount,
    itemPriceSnapshot: transactions.itemPriceSnapshot,
    createdAt: transactions.createdAt,
    // Session info
    sessionId: sessions.id,
    guestName: sessions.guestName,
    startTime: sessions.startTime,
    durationMinutes: sessions.durationMinutes,
    // PC info
    pcCode: pcs.pcCode,
    // Member info
    memberName: members.name,
    // Operator
    operatorUsername: users.username,
  })
    .from(transactions)
    .leftJoin(sessions, eq(transactions.sessionId, sessions.id))
    .leftJoin(pcs, eq(sessions.pcId, pcs.id))
    .leftJoin(members, eq(sessions.memberId, members.id))
    .leftJoin(users, eq(transactions.operatorId, users.id))
    .where(and(
      gte(transactions.createdAt, start),
      lte(transactions.createdAt, end),
    ))
    .orderBy(sql`${transactions.createdAt} DESC`)
    .limit(500);

  return c.json(rows.map(r => ({
    id: r.id,
    trxNumber: r.trxNumber,
    type: r.type,
    paymentMethod: r.paymentMethod,
    totalAmount: Number(r.totalAmount),
    itemPriceSnapshot: r.itemPriceSnapshot,
    createdAt: r.createdAt,
    pcCode: r.pcCode,
    customerName: r.memberName || r.guestName || '-',
    startTime: r.startTime,
    durationMinutes: r.durationMinutes,
    operator: r.operatorUsername,
  })));
});

// GET /api/reports/activity-log?startDate=...&endDate=...
reportsRoute.get('/activity-log', async (c) => {
  const { startDate, endDate } = c.req.query();
  const { start, end } = parseDateRange(startDate, endDate);

  const logs = await db.select({
    id: activityLogs.id,
    action: activityLogs.action,
    entityType: activityLogs.entityType,
    entityId: activityLogs.entityId,
    metadata: activityLogs.metadata,
    createdAt: activityLogs.createdAt,
    operatorUsername: users.username,
  })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.operatorId, users.id))
    .where(and(
      gte(activityLogs.createdAt, start),
      lte(activityLogs.createdAt, end),
    ))
    .orderBy(sql`${activityLogs.createdAt} DESC`)
    .limit(200);

  return c.json(logs.map(l => ({
    ...l,
    operator: l.operatorUsername ? { username: l.operatorUsername } : undefined,
  })));
});
