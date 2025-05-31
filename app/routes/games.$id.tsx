import { useState, useEffect, useId } from "react";
import type { Route } from "./+types/home";
import { useParams } from "react-router";
import useWebSocket from "react-use-websocket";
import { mutate, type Mutation, type State } from "workers/mechanics";
import type { JoinResponse, WSMessage } from "workers/shared-types";

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
  const [state, setState] = useState<State | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(id);
  //   const [socketUrl, setSocketUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const abortController = new AbortController();
    const existingPlayer = window.localStorage.getItem(`game-${id}`);

    fetch(`/api/games/${id}?playerId=${existingPlayer}`, {
      method: "GET",
      signal: abortController.signal,
    })
      .then(async (res) => (await res.json()) as JoinResponse)
      .then((data) => {
        setPlayerId(data.playerId);
        setState(data.state);
      });

    return () => {
      abortController.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const url = new URL(window.location.href);
    setSocketUrl(`ws://${url.host}/api/games/${id}`);
  }, [id]);

  const onMutate = (mutation: Mutation) => {
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
      playerId,
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
