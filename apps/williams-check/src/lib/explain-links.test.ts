import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { parseExplainWithLinks, renderExplainWithLinks } from "./explain-links"

describe("parseExplainWithLinks", () => {
  test("parses markdown link and surrounding text", () => {
    expect(
      parseExplainWithLinks("See [Cato paper](https://example.com/a) for details."),
    ).toEqual([
      { kind: "text", value: "See " },
      { kind: "link", label: "Cato paper", href: "https://example.com/a" },
      { kind: "text", value: " for details." },
    ])
  })

  test("parses multiple markdown links in order", () => {
    const segments = parseExplainWithLinks(
      "[one](https://a.test) and [two](http://b.test/path)",
    )
    expect(segments).toEqual([
      { kind: "link", label: "one", href: "https://a.test" },
      { kind: "text", value: " and " },
      { kind: "link", label: "two", href: "http://b.test/path" },
    ])
  })

  test("parses bare https URL", () => {
    expect(parseExplainWithLinks("Visit https://example.org/x today.")).toEqual([
      { kind: "text", value: "Visit " },
      { kind: "url", href: "https://example.org/x" },
      { kind: "text", value: " today." },
    ])
  })
})

describe("renderExplainWithLinks", () => {
  test("renders anchor with target blank and noreferrer", () => {
    const html = renderToStaticMarkup(
      createElement("p", null, renderExplainWithLinks("[label](https://safe.test)")),
    )
    expect(html).toContain('href="https://safe.test"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
    expect(html).toContain(">label<")
  })

  test("escapes raw HTML in plain text", () => {
    const html = renderToStaticMarkup(
      createElement("p", null, renderExplainWithLinks("<script>alert(1)</script>")),
    )
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })

  test("renders multiple links", () => {
    const html = renderToStaticMarkup(
      createElement(
        "p",
        null,
        renderExplainWithLinks(
          "A [first](https://one.test) then [second](https://two.test).",
        ),
      ),
    )
    expect(html).toContain('href="https://one.test"')
    expect(html).toContain(">first<")
    expect(html).toContain('href="https://two.test"')
    expect(html).toContain(">second<")
  })
})
