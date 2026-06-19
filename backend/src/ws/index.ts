import { WSContext } from 'hono/ws';

export const wsConnections = new Set<WSContext>();

export const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  wsConnections.forEach((ws) => {
    try {
      ws.send(message);
    } catch {
      wsConnections.delete(ws);
    }
  });
};

export const handleConnection = (ws: WSContext) => {
  wsConnections.add(ws);
};
