import type { GameSessions } from "@/routes/games.$id";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { mutate, type Mutation, type State } from "workers/mechanics";
import type {
  JoinResponse,
  WSMessageReceive,
  WSMessageSend,
} from "workers/shared-types";
import { useGlobalStore } from "@/store/global";

export const useGame = (id: string | undefined) => {
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
        setState(p => {
          if (!p) return null;
          const { nextState } = mutate({ ...message.data, currentState: p });
          return nextState;
        });
        break;
      }

      default:
        break;
    }
  }, [lastMessage, lastMessageProcessed, onMutate]);

  useEffect(() => {
    if (!playerId) return;

    useGlobalStore.setState(prev => {
      const player = state?.players.find(p => p.id === playerId);
      if (!player) return prev;

      return {
        playerId,
        gameState: state,
        onMutate,
        mapView: Object.fromEntries(
          Object.entries(state?.map ?? {}).map(([key, tile]) => {
            if (player.view.includes(key as `${number},${number}`))
              return [key, tile];
            return [key, { ...tile, kind: "fog", building: null }];
          }),
        ),
      };
    });
  }, [state, playerId, onMutate]);

  return {
    playerId,
    state,
    mutate: onMutate,
  };
};
