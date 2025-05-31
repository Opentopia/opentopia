import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

interface ActiveGame {
  id: string;
  code: string;
  playerCount: number;
  maxPlayers: number;
  status: "waiting" | "in-progress" | "finished";
}

interface ActiveGamesListProps {
  className?: string;
  onJoinGame?: (gameId: string) => void;
}

export const ActiveGamesList = ({
  className,
  onJoinGame,
}: ActiveGamesListProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [games, setGames] = useState<ActiveGame[]>([]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setGames([
        {
          id: "game1",
          code: "ABC123",
          playerCount: 2,
          maxPlayers: 4,
          status: "waiting",
        },
        {
          id: "game2",
          code: "XYZ789",
          playerCount: 4,
          maxPlayers: 4,
          status: "in-progress",
        },
        {
          id: "game3",
          code: "DEF456",
          playerCount: 3,
          maxPlayers: 4,
          status: "waiting",
        },
      ]);
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Card
              variant="secondary"
              key={i}
              className="p-3 animate-pulse h-[64px]"
            >
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <div className="h-4 bg-foreground/20 rounded w-16"></div>
                  <div className="h-3 bg-foreground/10 rounded w-24"></div>
                </div>
                <div className="h-8 bg-foreground/20 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (games.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-foreground/50">
          No active games found
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {games.map((game) => (
          <Card key={game.id} variant="secondary" className="p-3 h-[64px]">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm">{game.code}</span>
                <span className="text-xs text-foreground/60">
                  {game.playerCount}/{game.maxPlayers} players •{" "}
                  {game.status === "waiting"
                    ? "Waiting"
                    : game.status === "in-progress"
                    ? "In Progress"
                    : "Finished"}
                </span>
              </div>
              <div className="flex gap-2">
                {game.status === "waiting" &&
                  game.playerCount < game.maxPlayers && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-[100px]"
                      asChild
                    >
                      <Link to={`/games/${game.id}`}>Join</Link>
                    </Button>
                  )}
                {game.status === "in-progress" && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="w-[100px]"
                    asChild
                  >
                    <Link to={`/games/${game.id}`}>Spectate</Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col gap-3 p-3 ${className || ""}`}>
      <div className="w-full flex items-baseline-last justify-between pb-3 border-b border-dashed border-border/20">
        <h3 className="text-sm font-bold text-foreground/70 text-left">
          Active Games
        </h3>
        <span className="text-sm italic text-foreground/50 text-right">
          {isLoading ? "..." : `${games.length} games found`}
        </span>
      </div>
      {renderContent()}
    </div>
  );
};
