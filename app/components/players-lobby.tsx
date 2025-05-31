import { useGlobalStore } from "@/store/global";
import { Button } from "./ui/button";
import { type SVGProps } from "react";

export const PlayersLobby = ({ playerId }: { playerId: string }) => {
  const g = useGlobalStore(s => s.gameState);

  if (!g) return null;

  const { players } = g;

  const gameHost = players.find(p => p.isHost);
  const isHost = gameHost?.id === playerId;

  return (
    <div className={`flex flex-col gap-3 p-3 h-full`}>
      <div className="w-full flex items-baseline justify-between pb-3 border-b border-dashed border-border/20">
        <h3 className="text-sm font-bold text-foreground/70 text-left">
          Players
        </h3>
        <span className="text-sm italic text-foreground/50 text-right">
          {players.length} players
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {players.map(player => (
          <div
            key={player.id}
            className="flex flex-col gap-2 bg-card shadow-card-inset-secondary border border-border"
          >
            <div className="w-full min-h-20 bg-accent/10 border-b border-border/20 flex items-center justify-center">
              <PlayerIcon
                className="size-12"
                mainColor={player.colors[0]}
                secondaryColor={player.colors[1]}
              />
            </div>
            <p className="text-sm font-display text-foreground/50 text-center py-1.5 px-3">
              {player.name}
            </p>
          </div>
        ))}
      </div>

      <div className="h-12 mt-auto flex items-center justify-center">
        {isHost ? (
          <Button disabled={players.length < 2} className="size-full">
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

const PlayerIcon = ({
  mainColor,
  secondaryColor,
  ...props
}: SVGProps<SVGSVGElement> & {
  mainColor: string;
  secondaryColor: string;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={33}
      height={32}
      viewBox="0 0 33 32"
      fill="none"
      {...props}
    >
      <path fill="#000" d="M.5 0h32v32H.5z" />
      <path fill={mainColor} d="M1.115.615h30.769v30.769H1.115z" />
      <path
        fill="#000"
        d="M7.269 11.692H12.5V16H7.269zM20.5 11.692h5.231V16H20.5z"
      />
      <path
        fill={secondaryColor}
        d="M1.115.615h30.769v7.077H1.115zM14.961 24.308h3.077v3.385h-3.077zM1.115 7.692h3.077v5.846H1.115zM4.192 7.692h1.846v2.154H4.192z"
      />
      <path
        fill={secondaryColor}
        d="M13.116 6.461h1.846v2.154h-1.846zM15.577 27.692h1.846v.923h-1.846zM26.961 7.692h1.846v2.154h-1.846zM28.808 7.692h3.077v5.846h-3.077z"
      />
      <path fill="#000" d="M12.808 22.154H20.5v1.538h-7.692z" />
    </svg>
  );
};
