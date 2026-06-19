import { db } from '../db/index.js';
import { pcs, sessions, activityLogs } from '../db/schema.js';
import { eq, and, lte } from 'drizzle-orm';
import { broadcast } from '../ws/index.js';

export const checkExpiredSessions = async () => {
  try {
    const now = new Date();
    
    // Find all running sessions where endTime <= now
    const expiredSessions = await db.select().from(sessions)
      .where(and(eq(sessions.status, 'running'), lte(sessions.endTime, now)));

    if (expiredSessions.length === 0) return;

    console.log(`[Cron] Found ${expiredSessions.length} expired sessions. Auto-closing...`);

    // We do this sequentially to avoid transaction lock complexity for background job
    for (const session of expiredSessions) {
      await db.transaction(async (tx) => {
        // Update Session
        await tx.update(sessions)
          .set({ status: 'completed' })
          .where(eq(sessions.id, session.id));

        // Update PC
        await tx.update(pcs)
          .set({ status: 'available' })
          .where(eq(pcs.id, session.pcId));

        // Log Activity (System generated, operatorId 1 = admin for now, or define a system user)
        // Here we'll just log it against the first user or skip if no system user.
        // Assuming admin is ID 1
        await tx.insert(activityLogs).values({
          operatorId: 1, // fallback to admin
          action: 'auto_end_session',
          entityType: 'session',
          entityId: session.id,
          metadata: { pcId: session.pcId, expiredAt: session.endTime }
        });
      });

      // Broadcast update to frontends
      broadcast({
        type: 'PC_STATUS_UPDATE',
        payload: {
          pcId: session.pcId,
          status: 'available',
        }
      });
      
      // We can also emit an event for the Client App
      broadcast({
        type: 'CLIENT_TIME_EXPIRED',
        payload: {
          pcId: session.pcId,
        }
      });
    }
  } catch (error) {
    console.error('[Cron] Error checking expired sessions:', error);
  }
};

// Run every 30 seconds
export const startCronJobs = () => {
  console.log('[Cron] Session checker started.');
  setInterval(checkExpiredSessions, 30 * 1000);
};
