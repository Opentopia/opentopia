import { useGlobalStore } from "@/store/global";
import { Button } from "./ui/button";

export const PlayersLobby = ({ playerId }: { playerId: string }) => {
  const g = useGlobalStore(s => s.gameState);

  if (!g) return null;

  const { players, id } = g;

  const gameHost = players.find(p => p.id === id);
  const isHost = gameHost?.id === playerId;

  return (
    <div className={`flex flex-col gap-3 p-3`}>
      <div className="w-full flex items-baseline justify-between pb-3 border-b border-dashed border-border/20">
        <h3 className="text-sm font-bold text-foreground/70 text-left">
          Players
        </h3>
        <span className="text-sm italic text-foreground/50 text-right">
          {players.length} players
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {players.map(player => (
          <div key={player.id}>{player.name}</div>
        ))}
      </div>

      <div className="h-12">
        {isHost ? (
          <Button disabled={players.length < 2} className="h-full">
            Start Game
          </Button>
        ) : (
          <p className="text-sm text-foreground/50">
            Waiting for host to start game...
          </p>
        )}
      </div>
    </div>
  );
};
