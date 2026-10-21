import start from "@tanstack/react-start/server-entry";

export { SwayRoom } from "./game/sway-room";

type Env = { ROOMS?: SwayRoomNamespace };

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/sway-ws") {
      if (!env.ROOMS) return new Response("Rooms are not attached.", { status: 503 });
      return env.ROOMS.get(env.ROOMS.idFromName("sway")).fetch(request);
    }
    return start.fetch(request);
  },
};
