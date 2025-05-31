import type { Route } from "./+types/home";
import { useParams, useNavigate } from "react-router";
import { GameLobby } from "@/components/ui/game-lobby";
import { GL } from "@/gl";
import { useGame } from "@/hooks/use-game";

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
      <GL />
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
