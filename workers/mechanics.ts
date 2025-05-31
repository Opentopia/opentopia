export type State = {};

export type Mutation =
  | {
      type: "move";
      warriorId: string;
      tp: [number, number];
    }
  | {
      type: "attack";
      warriorId: string;
      targetWarriorId: string;
    };

export function mutate(playerId: string, state: State, mutation: Mutation) {}
