const port = Number(process.env.PORT ?? 8080);

Bun.serve({
  port,
  fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file("index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`ShelfPlay privacy policy at http://localhost:${port}/`);
