import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoute } from './routes/auth.js';
import { pcsRoute } from './routes/pcs.js';
import { membersRoute } from './routes/members.js';
import { pricesRoute } from './routes/prices.js';
import { sessionsRoute } from './routes/sessions.js';
import { reportsRoute } from './routes/reports.js';
import { createNodeWebSocket } from '@hono/node-ws';
import { handleConnection } from './ws/index.js';
import { startCronJobs } from './cron/sessionChecker.js';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use('*', logger());
app.use('*', cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.get('/', (c) => {
  return c.text('El Matadore Net API v1.0');
});

// Routes
app.route('/api/auth', authRoute);
app.route('/api/pcs', pcsRoute);
app.route('/api/members', membersRoute);
app.route('/api/prices', pricesRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/reports', reportsRoute);

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen(evt, ws) {
      handleConnection(ws);
    },
  };
}));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

startCronJobs();

const server = serve({
  fetch: app.fetch,
  port,
});

injectWebSocket(server);

console.log(`Server is running on port ${port}`);
