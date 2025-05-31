import type { Mutation, State, MutateProps } from "./mechanics";

export type WSMessageSend = {
  type: "mutation";
  mutation: Mutation;
  session: string;
};

export type WSMessageReceive =
  | {
      type: "mutation";
      data: MutateProps;
    }
  | {
      type: "join";
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
