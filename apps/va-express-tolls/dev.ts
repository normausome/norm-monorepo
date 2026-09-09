// `bun run dev`: API server (with reload on change) + Vite, in one terminal.
const procs = [
  Bun.spawn(["bun", "--watch", "server/index.ts"], { stdout: "inherit", stderr: "inherit" }),
  Bun.spawn(["bunx", "vite"], { stdout: "inherit", stderr: "inherit" }),
]

const stop = () => {
  for (const p of procs) p.kill()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)

await Promise.race(procs.map((p) => p.exited))
stop()
