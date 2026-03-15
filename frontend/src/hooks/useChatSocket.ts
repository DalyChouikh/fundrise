import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessageDetail } from "@/types";

interface UseChatSocketOptions {
  roomId: number | null;
  onMessage: (msg: ChatMessageDetail) => void;
}

export function useChatSocket({ roomId, onMessage }: UseChatSocketOptions) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;

    let ws: WebSocket | null = null;
    let cancelled = false;

    async function connect() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.access_token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/chat/${roomId}/?token=${session.access_token}`;
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ChatMessageDetail;
          onMessageRef.current(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!cancelled) setConnected(false);
      };

      ws.onerror = () => {
        if (!cancelled) setConnected(false);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
      setConnected(false);
    };
  }, [roomId]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "chat_message", content })
      );
    }
  }, []);

  return { connected, sendMessage };
}
