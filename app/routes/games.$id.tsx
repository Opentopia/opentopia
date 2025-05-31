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
            className="fixed inset-0 gap-4 flex items-end justify-between p-3 md:p-6 pointer-events-none"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-background font-bold font-display text-[40px]">
              <AnimatePresence mode="wait">
                {isMyTurn ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className=""
                  >
                    YOUR TURN
                  </motion.div>
                ) : (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-md:text-sm"
                  >
                    Waiting for {state.turn?.playerId.slice(0, 4)}'s turn
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-3">
              <Button
                variant="tertiary"
                size="lg"
                onClick={() => mutate({ type: "resign" })}
              >
                Resign
              </Button>
            </div>

            <div className="bg-black/80 text-white p-4 rounded-md max-w-md">
              <div className="flex gap-2">
                <Button
                  disabled={!isMyTurn}
                  size="lg"
                  onClick={() => mutate({ type: "end-turn" })}
                >
                  End turn
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export type GameSessions = Record<string, string>;
