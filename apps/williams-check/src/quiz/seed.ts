export function parseSeedFromHash(hash: string): string | null {
  const trimmed = hash.replace(/^#/, "")
  if (!trimmed) return null
  const params = new URLSearchParams(trimmed)
  const seed = params.get("seed")
  return seed && seed.length > 0 ? seed : null
}

export function hashStringToUint32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const copy = [...items]
  const rng = mulberry32(hashStringToUint32(seed))
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i]!
    copy[i] = copy[j]!
    copy[j] = tmp
  }
  return copy
}
