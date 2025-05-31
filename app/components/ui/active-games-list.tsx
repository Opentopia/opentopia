import { useState, useEffect } from "react";
import { Card } from "./card";
import { Button } from "./button";
import { Link } from "react-router";
import type { GamesListResponse } from "workers/shared-types";

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
    const fetchGames = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/games");
        const gamesData = (await response.json()) as GamesListResponse;

        // Transform the API response to match our UI needs
        const transformedGames: ActiveGame[] = gamesData.map(game => {
          const playerCount = game.state.players.length;
          const maxPlayers = 4; // Based on workspace rules

          let status: ActiveGame["status"];
          switch (game.state.status) {
            case "lobby":
              status = "waiting";
              break;
            case "started":
              status = "in-progress";
              break;
            case "finished":
              status = "finished";
              break;
            default:
              status = "waiting";
          }

          return {
            id: game.id,
            code: game.id.substring(0, 6).toUpperCase(), // Generate a display code from ID
            playerCount,
            maxPlayers,
            status,
          };
        });

        setGames(transformedGames);
      } catch (error) {
        console.error("Failed to fetch games:", error);
        setGames([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchGames();

    // Set up interval to refresh games every 5 seconds
    const interval = setInterval(() => {
      fetchGames();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => (
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
        {games.map(game => (
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
      <div className="w-full flex items-baseline justify-between pb-3 border-b border-dashed border-border/20">
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
