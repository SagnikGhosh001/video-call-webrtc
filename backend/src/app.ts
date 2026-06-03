import { handleConnection } from "./signalingHandler.ts";

export function startServer(port = 8080): void {
  console.log(`Signaling server running on ws://0.0.0.0:${port}/ws`);

  Deno.serve({ port, hostname: "0.0.0.0" }, (req: Request) => {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }
      const { socket, response } = Deno.upgradeWebSocket(req);
      handleConnection(socket);
      return response;
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  });
}
