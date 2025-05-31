import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { toast } from "sonner";
import { Link } from "react-router";
import { ArrowLeft, Copy, Share2 } from "lucide-react";

interface GameLobbyProps {
  gameId: string;
  gameCode: string;
  onBackToHome?: () => void;
}

export const GameLobby = ({
  gameId,
  gameCode,
  onBackToHome,
}: GameLobbyProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      toast.success("Game code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy game code");
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/games/${gameId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy invite link");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      <Card className="p-2 pointer-events-auto">
        <div className="flex flex-col gap-8 items-center bg-background shadow-card-inset p-10 pb-6 max-w-[500px] md:min-w-[400px]">
          <div className="flex flex-col items-center w-full py-3 gap-4">
            <div className="flex items-center justify-between w-full">
              <Link to="/">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-display font-bold">Game Lobby</h1>
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>

            <div className="text-center">
              <p className="text-sm text-foreground/70 mb-2">
                Share this code with friends to join:
              </p>
              <Button
                variant="default"
                size="lg"
                className="font-display font-bold text-2xl px-8 py-4 min-w-[200px] relative"
                onClick={handleCopyCode}
              >
                {gameCode}
                <Copy className="w-5 h-5 ml-3 opacity-70" />
              </Button>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleShareInvite}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share invite link
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-foreground/50">
                Waiting for players to join...
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
