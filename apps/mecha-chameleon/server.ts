import { join } from "path";
import { file, serve } from "bun";

const dist = join(import.meta.dir, "dist");
const port = Number(process.env.PORT) || 3000;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    const filePath = join(dist, pathname);
    const f = file(filePath);
    if (await f.exists()) {
      const ext = pathname.slice(pathname.lastIndexOf("."));
      const headers = ext in MIME ? { "Content-Type": MIME[ext] } : undefined;
      return new Response(f, headers ? { headers } : undefined);
    }

    return new Response(file(join(dist, "index.html")), {
      headers: { "Content-Type": "text/html" },
    });
  },
});

console.log(`Mecha Chameleon serving dist/ on http://0.0.0.0:${port}`);
