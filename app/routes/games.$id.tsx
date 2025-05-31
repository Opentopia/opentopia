import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/home";
import { useParams } from "react-router";
import useWebSocket from "react-use-websocket";
import { mutate, type Mutation, type State } from "workers/mechanics";
import type {
  JoinResponse,
  WSMessageReceive,
  WSMessageSend,
} from "workers/shared-types";
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

  const isMyTurn = state?.turn?.playerId === playerId;

  return (
    <div>
      {isMyTurn && <div>IS MY TURN</div>}
      <pre>{JSON.stringify({ playerId, state }, null, 2)}</pre>
      <div>
        <button
          onClick={() =>
            mutate({
              type: "move",
              unitId: "dude",
              to: "1,1",
            })
          }
        >
          Test move
        </button>
        <button onClick={() => mutate({ type: "end-turn" })}>End turn</button>
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
      const storage = "sessionStorage";
      const existingSession = window[storage].getItem(`game-${id}`);
      console.log("existingSession", existingSession);
      const res = await fetch(`/api/games/${id}`, {
        headers: existingSession
          ? { Authorization: `Bearer ${existingSession}` }
          : undefined,
      });
      const data = (await res.json()) as JoinResponse;
      if (!data.success) {
        throw new Error("Failed to join game");
      }
      window[storage].setItem(`game-${id}`, data.session);
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
    setSocketUrl(`${url.origin.replace("http", "ws")}/api/games/${id}/ws`);
  }, [id, session]);

  const onMutate = useCallback(
    (mutation: Mutation) => {
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
      } satisfies WSMessageSend);
    },
    [session, playerId, state, sendJsonMessage]
  );

  useEffect(() => {
    if (!lastMessage) return;

    const message = JSON.parse(lastMessage.data) as WSMessageReceive;

    switch (message.type) {
      case "mutation": {
        const { nextState } = mutate(message.data);
        setState(nextState);
        break;
      }

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
