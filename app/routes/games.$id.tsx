import { useState, useEffect, useCallback } from "react";
import type { Route } from "./+types/home";
import { useParams, useNavigate } from "react-router";
import useWebSocket from "react-use-websocket";
import { mutate, type Mutation, type State } from "workers/mechanics";
import type {
  JoinResponse,
  WSMessageReceive,
  WSMessageSend,
} from "workers/shared-types";
import { useQuery } from "@tanstack/react-query";
import { GameLobby } from "@/components/ui/game-lobby";
import { GL } from "@/gl";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Game Lobby - Opentopia" },
    { name: "description", content: "Join the battle in Opentopia!" },
  ];
}

export default function GamePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playerId, state, mutate } = useGame(id);

  const isMyTurn = state?.turn?.playerId === playerId;

  // Generate game code from the actual game ID
  const gameCode = id ? id.substring(0, 6).toUpperCase() : "------";

  const handleBackToHome = () => {
    navigate("/");
  };

  // Show lobby while waiting for game to start or during setup
  const showLobby = !state || !state.turn || state.turn.playerId === null;

  if (!state) return <div>Loading...</div>;

  if (showLobby && id) {
    return (
      <div className="fixed w-screen h-screen">
        {/* <GL /> */}
        <button onClick={() => mutate({ type: "start-game" })}>
          start game HOBO
        </button>
        <GameLobby
          gameId={id}
          gameCode={gameCode}
          onBackToHome={handleBackToHome}
        />
      </div>
    );
  }

  // Game has started - show debug interface for now
  return (
    <div className="fixed w-screen h-screen">
      <GL state={state} />
      <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-md max-w-md">
        {isMyTurn && (
          <div className="text-green-400 font-bold mb-2">YOUR TURN</div>
        )}
        <pre className="text-xs mb-4">
          {JSON.stringify({ playerId, state }, null, 2)}
        </pre>
        <div className="flex gap-2">
          <button
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
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
          <button
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
            onClick={() => mutate({ type: "end-turn" })}
          >
            End turn
          </button>
          <button
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
            onClick={handleBackToHome}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

export type GameSessions = Record<string, string>;

const useGame = (id: string | undefined) => {
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const { lastMessage, sendJsonMessage } = useWebSocket(socketUrl);

  const { data } = useQuery({
    queryKey: ["game", id],
    queryFn: async () => {
      if (!id) return;

      const storage = "sessionStorage";
      const sessions = JSON.parse(
        window[storage].getItem(`game-sessions`) || "{}",
      ) as GameSessions;
      const existingSession = sessions[id];
      const res = await fetch(`/api/games/${id}`, {
        headers: existingSession
          ? { Authorization: `Bearer ${existingSession}` }
          : undefined,
      });
      const data = (await res.json()) as JoinResponse;
      if (!data.success) {
        throw new Error("Failed to join game");
      }
      sessions[id] = data.session;
      window[storage].setItem(`game-sessions`, JSON.stringify(sessions));
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
    [session, playerId, state, sendJsonMessage],
  );

  const [lastMessageProcessed, setLastMessageProcessed] =
    useState<MessageEvent<any> | null>(null);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessageProcessed === lastMessage) return;
    setLastMessageProcessed(lastMessage);

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
  }, [lastMessage, lastMessageProcessed, onMutate]);

  return {
    playerId,
    state,
    mutate: (mutation: Mutation) => {
      onMutate(mutation);
    },
  };
};
