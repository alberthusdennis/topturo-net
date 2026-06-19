import { useEffect, useRef } from 'react';

export const useWebSocket = (url: string, onMessage: (msg: any) => void) => {
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WS Connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      ws.current.onclose = () => {
        console.log('WS Disconnected. Reconnecting in 3s...');
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      ws.current?.close();
    };
  }, [url, onMessage]);

  return ws.current;
};
