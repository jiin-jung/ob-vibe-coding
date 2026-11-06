import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { app as api } from "./app.ts";

const root = new Hono();
root.route("/", api);
root.use("/*", serveStatic({ root: "../frontend/dist" }));
root.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: root.fetch, port, hostname: "0.0.0.0" }, () => console.log(`http://0.0.0.0:${port}`));
