/**
 * useWebSocket — React hook for ImpactSensei real-time connection.
 * Handles: auto-connect, heartbeat, reconnect, room management, events.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000";
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const RECONNECT_DELAY = 3_000;
const MAX_RECONNECT = 5;

export type WSEvent = {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

type EventHandler = (event: WSEvent) => void;

interface UseWebSocketReturn {
  connected: boolean;
  onlineCount: number;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendTypingStart: (room: string, userName: string) => void;
  sendTypingStop: (room: string) => void;
  on: (eventType: string, handler: EventHandler) => () => void;
  send: (type: string, payload: Record<string, unknown>) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user, isAuthenticated } = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlers = useRef<Map<string, Set<EventHandler>>>(new Map());

  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const emit = useCallback((event: WSEvent) => {
    const set = handlers.current.get(event.type);
    if (set) set.forEach((h) => h(event));
    // Also fire wildcard handlers
    const wildcard = handlers.current.get("*");
    if (wildcard) wildcard.forEach((h) => h(event));
  }, []);

  const send = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type, payload }));
      }
    },
    [],
  );

  const connect = useCallback(() => {
    if (!user?.id || !isAuthenticated) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws/${user.id}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        send("ping", {});
      }, HEARTBEAT_INTERVAL);
    };

    socket.onmessage = (e) => {
      try {
        const event: WSEvent = JSON.parse(e.data);
        if (event.type === "connected") {
          setOnlineCount((event.payload.online_count as number) || 1);
        } else if (event.type === "user_online" || event.type === "user_offline") {
          setOnlineCount((c) =>
            event.type === "user_online" ? c + 1 : Math.max(1, c - 1),
          );
        }
        emit(event);
      } catch {}
    };

    socket.onclose = () => {
      setConnected(false);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      // Auto-reconnect
      if (reconnectCount.current < MAX_RECONNECT) {
        reconnectCount.current++;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [user?.id, isAuthenticated, send, emit]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connect();
    }
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [isAuthenticated, user?.id, connect]);

  const joinRoom = useCallback(
    (room: string) => send("join_room", { room }),
    [send],
  );
  const leaveRoom = useCallback(
    (room: string) => send("leave_room", { room }),
    [send],
  );
  const sendTypingStart = useCallback(
    (room: string, userName: string) =>
      send("typing_start", { room, user_name: userName }),
    [send],
  );
  const sendTypingStop = useCallback(
    (room: string) => send("typing_stop", { room }),
    [send],
  );

  const on = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlers.current.has(eventType)) {
      handlers.current.set(eventType, new Set());
    }
    handlers.current.get(eventType)!.add(handler);
    return () => {
      handlers.current.get(eventType)?.delete(handler);
    };
  }, []);

  return { connected, onlineCount, joinRoom, leaveRoom, sendTypingStart, sendTypingStop, on, send };
}
