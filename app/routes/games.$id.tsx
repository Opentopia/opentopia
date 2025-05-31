import type { Route } from "./+types/home";
import { useParams, useNavigate } from "react-router";
import { GL } from "@/gl";
import { useGame } from "@/hooks/use-game";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

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

  console.log(showLobby);
  return (
    <>
      <GL />
      <AnimatePresence mode="wait">
        {!showLobby && (
          <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 gap-4 flex items-end justify-between p-3 md:p-6"
          >
            {isMyTurn && (
              <div className="text-[48px] font-bold font-display absolute top-4">
                YOUR TURN
              </div>
            )}

            <Button variant="tertiary" size="lg" onClick={handleBackToHome}>
              Back home
            </Button>

            <div className="bg-black/80 text-white p-4 rounded-md max-w-md">
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
                  className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                  onClick={handleBackToHome}
                >
                  Back to home
                </button>
                {state.turn?.playerId === playerId ? (
                  <Button
                    disabled={!isMyTurn}
                    size="lg"
                    onClick={() => mutate({ type: "end-turn" })}
                  >
                    End turn
                  </Button>
                ) : (
                  <span
                    className="bg-gray-600  px-3 py-1 rounded text-sm"
                    onClick={() => mutate({ type: "end-turn" })}
                  >
                    Waiting for {state.turn?.playerId.slice(0, 4)}'s turn
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export type GameSessions = Record<string, string>;
