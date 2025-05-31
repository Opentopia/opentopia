import type { Mutation, State } from "./mechanics";

export type WSMessage = {
  type: "mutation";
  mutation: Mutation;
  session: string;
};

export type JoinResponse =
  | {
      success: true;
      session: string;
      playerId: string;
      state: State;
    }
  | {
      success: false;
      error: "game ended" | "game started";
    };
