# ShelfPlay privacy policy

Static privacy policy page for the ShelfPlay iOS app (App Store review).

## Local

```bash
bun run dev
```

Open `http://localhost:8080/` (or the port in `PORT`).

## Railway

1. Create a service in the monorepo Railway project (or a dedicated service).
2. Set **Root Directory** to `apps/shelfplay-privacy`.
3. Railway detects the `Dockerfile` and builds the image.
4. Assign a public domain; the policy is served at **`/`** (same content at `/index.html`).

No environment variables are required. Railway injects `PORT`; the server listens on it.

## App Store URL

Point ShelfPlay’s privacy policy field at the Railway public URL root, e.g. `https://<your-service>.up.railway.app/`.
