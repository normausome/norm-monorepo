import { createElement, type ReactNode } from "react"

export type ExplainSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; label: string; href: string }
  | { kind: "url"; href: string }

const MD_LINK_AT = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/
const BARE_URL_AT = /^https?:\/\/[^\s<>"']+/

/** Split explain text into plain text and link segments (markdown links before bare URLs). */
export function parseExplainWithLinks(text: string): ExplainSegment[] {
  const segments: ExplainSegment[] = []
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    const md = MD_LINK_AT.exec(rest)
    if (md) {
      segments.push({ kind: "link", label: md[1]!, href: md[2]! })
      i += md[0].length
      continue
    }
    const url = BARE_URL_AT.exec(rest)
    if (url) {
      segments.push({ kind: "url", href: url[0] })
      i += url[0].length
      continue
    }
    let j = i + 1
    while (j < text.length) {
      const tail = text.slice(j)
      if (MD_LINK_AT.test(tail) || BARE_URL_AT.test(tail)) break
      j++
    }
    segments.push({ kind: "text", value: text.slice(i, j) })
    i = j
  }
  return segments
}

const linkClass =
  "text-primary underline underline-offset-4 break-all hover:opacity-90"

export function renderExplainWithLinks(text: string): ReactNode {
  const segments = parseExplainWithLinks(text)
  return segments.map((segment, index) => {
    if (segment.kind === "text") {
      return segment.value
    }
    const href = segment.href
    const children = segment.kind === "link" ? segment.label : href
    return createElement(
      "a",
      {
        key: index,
        href,
        target: "_blank",
        rel: "noreferrer",
        className: linkClass,
      },
      children,
    )
  })
}
