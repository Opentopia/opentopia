import { useState, useEffect, useId } from "react";
import type { Route } from "./+types/home";
import { useParams } from "react-router";
import useWebSocket from "react-use-websocket";
import { mutate, type Mutation, type State } from "workers/mechanics";
import type { JoinResponse, WSMessage } from "workers/shared-types";
import { useQuery } from "@tanstack/react-query";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const { id } = useParams();
  const { playerId, state, mutate } = useGame(id);

  return (
    <div>
      <pre>{JSON.stringify({ playerId, state }, null, 2)}</pre>
      <div>
        <button
          onClick={() =>
            mutate({
              type: "move",
              warriorId: "dude",
              to: "1:1",
            })
          }
        >
          Test move
        </button>
      </div>
    </div>
  );
}

const useGame = (id: string | undefined) => {
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const { lastMessage, sendJsonMessage } = useWebSocket(socketUrl);

  const { data } = useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      const existingSession = window.localStorage.getItem(`game-${id}`);
      const res = await fetch(`/api/games/${id}`, {
        headers: existingSession
          ? { Authorization: `Bearer ${existingSession}` }
          : undefined,
      });
      const data = (await res.json()) as JoinResponse;
      if (!data.success) {
        throw new Error("Failed to join game");
      }
      window.localStorage.setItem(`game-${id}`, data.session);
      return data;
    },
    enabled: !!id,
  });

  const session = data?.session;
  const playerId = data?.playerId;
  const initialState = data?.state;
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (state || !initialState) return;
    setState(initialState); // initial state
  }, [initialState, state]);

  useEffect(() => {
    if (!id) return;
    if (!session) return;

    const url = new URL(window.location.href);
    setSocketUrl(`ws://${url.host}/api/games/${id}`);
  }, [id]);

  const onMutate = (mutation: Mutation) => {
    if (!session) throw new Error("Session is not set");
    if (!playerId) throw new Error("Player ID is not set");
    if (!state) throw new Error("State is not set");
    const { nextState } = mutate({
      playerId,
      currentState: state,
      timestamp: Date.now(),
      mutation,
    });
    setState(nextState);
    sendJsonMessage({
      type: "mutation",
      session,
      mutation,
    } satisfies WSMessage);
  };

  useEffect(() => {
    if (!lastMessage) return;

    const message = JSON.parse(lastMessage.data) as WSMessage;

    switch (message.type) {
      case "mutation":
        onMutate(message.mutation);
        break;

      default:
        break;
    }
  }, [lastMessage, onMutate]);

  return {
    playerId,
    state,
    mutate: (mutation: Mutation) => {
      onMutate(mutation);
    },
  };
};
