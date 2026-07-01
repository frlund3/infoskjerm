import { describe, it, expect } from "vitest"
import { isPdfUrl, isPptUrl, isDeckUrl } from "./deck"

describe("isPdfUrl", () => {
  it("gjenkjenner .pdf uansett store/små bokstaver", () => {
    expect(isPdfUrl("https://x/y/avis.pdf")).toBe(true)
    expect(isPdfUrl("https://x/y/AVIS.PDF")).toBe(true)
  })
  it("ignorerer query-string", () => {
    expect(isPdfUrl("https://x/avis.pdf?token=abc")).toBe(true)
  })
  it("er false for bilder, video og PowerPoint", () => {
    expect(isPdfUrl("https://x/bilde.jpg")).toBe(false)
    expect(isPdfUrl("https://x/film.mp4")).toBe(false)
    expect(isPdfUrl("https://x/deck.pptx")).toBe(false)
  })
  it("er false for tom/null/undefined", () => {
    expect(isPdfUrl(null)).toBe(false)
    expect(isPdfUrl(undefined)).toBe(false)
    expect(isPdfUrl("")).toBe(false)
  })
})

describe("isPptUrl", () => {
  it("gjenkjenner .pptx og .ppt uansett bokstaver + query", () => {
    expect(isPptUrl("https://x/deck.pptx")).toBe(true)
    expect(isPptUrl("https://x/DECK.PPTX")).toBe(true)
    expect(isPptUrl("https://x/gammel.ppt")).toBe(true)
    expect(isPptUrl("https://x/deck.pptx?v=2")).toBe(true)
  })
  it("er false for pdf, bilder og video", () => {
    expect(isPptUrl("https://x/avis.pdf")).toBe(false)
    expect(isPptUrl("https://x/bilde.png")).toBe(false)
    expect(isPptUrl("https://x/film.webm")).toBe(false)
  })
  it("blander ikke .ppt-suffiks inn i urelaterte navn", () => {
    // «.pptx» slutter på «ptx», ikke «.ppt» — men et filnavn som «rapport.ppt»
    // skal treffe, mens «konsept.txt» ikke skal.
    expect(isPptUrl("https://x/konsept.txt")).toBe(false)
  })
  it("er false for tom/null/undefined", () => {
    expect(isPptUrl(null)).toBe(false)
    expect(isPptUrl(undefined)).toBe(false)
    expect(isPptUrl("")).toBe(false)
  })
})

describe("isDeckUrl", () => {
  it("er true for både pdf og ppt(x)", () => {
    expect(isDeckUrl("https://x/avis.pdf")).toBe(true)
    expect(isDeckUrl("https://x/deck.pptx")).toBe(true)
    expect(isDeckUrl("https://x/gammel.ppt")).toBe(true)
  })
  it("er false for bilder, video og tomt", () => {
    expect(isDeckUrl("https://x/bilde.jpg")).toBe(false)
    expect(isDeckUrl("https://x/film.mov")).toBe(false)
    expect(isDeckUrl(null)).toBe(false)
  })
})
