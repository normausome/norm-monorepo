const port = Number(process.env.PORT ?? 8080);

// Tab and home-screen icons; anything else besides the page is 404.
const ICONS: Record<string, string> = {
  "/favicon.svg": "image/svg+xml",
  "/favicon.png": "image/png",
  "/favicon.ico": "image/x-icon",
  "/apple-touch-icon.png": "image/png",
};

Bun.serve({
  port,
  fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file("index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    const type = ICONS[path];
    if (type) {
      return new Response(Bun.file(path.slice(1)), {
        headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`ShelfPlay privacy policy at http://localhost:${port}/`);
