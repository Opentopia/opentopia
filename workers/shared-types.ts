import type { Mutation, State } from "./mechanics";

export type WSMessage = {
  type: "mutation";
  playerId: string;
  mutation: Mutation;
};

export type JoinResponse = {
  playerId: string;
  state: State;
};
