import { DurableObject } from "cloudflare:workers";
import { mutate } from "./mechanics";

export class Game extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }
}
