import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { useParams } from "react-router";
import useWebSocket from "react-use-websocket";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const { id } = useParams();
  const { messages } = useGameConnection(id);

  return (
    <div>
      {id}
      <div>
        {messages.map((message) => (
          <div key={message}>{message}</div>
        ))}
      </div>
    </div>
  );
}

const useGameConnection = (id: string | undefined) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [socketUrl, setSocketUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const url = new URL(window.location.href);
    setSocketUrl(`ws://${url.host}/api/games/${id}`);
  }, [id]);

  const { lastMessage } = useWebSocket(socketUrl);

  useEffect(() => {
    if (lastMessage) {
      setMessages((prev) => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return { ws, messages };
};
