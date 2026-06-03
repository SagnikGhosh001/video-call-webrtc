import { startServer } from "./src/app.ts";

const port = parseInt(Deno.env.get("PORT") ?? "8080");
startServer(port);
