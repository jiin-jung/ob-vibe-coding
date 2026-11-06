import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as api, purgeExpiredPhotos } from "./app.ts";

const root = new Hono();
root.route("/", api);
root.use("/*", serveStatic({ root: "../frontend/dist" }));
root.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

const purge = () => purgeExpiredPhotos().catch((error) => console.error("[photos]", error));
void purge();
setInterval(purge, 60 * 60_000);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: root.fetch, port, hostname: "0.0.0.0" }, () => console.log(`http://0.0.0.0:${port}`));
