import type { Env } from "./env.js";
import type { SessionData } from "./lib/session.js";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: SessionData;
  };
};
