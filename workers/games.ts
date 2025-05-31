import { DurableObject } from "cloudflare:workers";
import { env } from "cloudflare:workers";

export class GamesIndex extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.ctx.storage.sql.exec(
      "create table if not exists games (id text primary key)"
    );
  }

  async createGame() {
    const id = crypto.randomUUID();
    this.ctx.storage.sql.exec<{
      id: string;
    }>("insert into games (id) values (?)", [id]);

    const stub = env.GAME.get(env.GAME.idFromName(id));
    const state = await stub.getState();

    return Response.json({ id, state });
  }

  async getGames() {
    const games = this.ctx.storage.sql
      .exec<{ id: string }>("select * from games")
      .toArray();
    const resolved = await Promise.all(
      games.map(async ({ id }) => {
        const stub = env.GAME.get(env.GAME.idFromName(id));
        const state = await stub.getState();
        return { id, state };
      })
    );

    return Response.json(resolved);
  }
}
