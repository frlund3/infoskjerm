import { describe, it, expect } from "vitest"
import { checkFile, contentTypeFor } from "./media-uploader"

const SLIDE_ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "video/mp4", "video/webm", "video/quicktime",
]
const MB = 1024 * 1024

describe("contentTypeFor", () => {
  it("bruker nettleserens type når den finnes", () => {
    expect(contentTypeFor({ name: "a.pptx", size: 1, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }))
      .toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation")
  })
  it("utleder .pptx fra endelsen når nettleseren ga tom type", () => {
    expect(contentTypeFor({ name: "Presentasjon.pptx", size: 1, type: "" }))
      .toBe("application/vnd.openxmlformats-officedocument.presentationml.presentation")
  })
  it("utleder .ppt (gammel binær) fra endelsen", () => {
    expect(contentTypeFor({ name: "gammel.ppt", size: 1, type: "" })).toBe("application/vnd.ms-powerpoint")
  })
  it("faller tilbake til octet-stream for ukjent endelse", () => {
    expect(contentTypeFor({ name: "fil.xyz", size: 1, type: "" })).toBe("application/octet-stream")
  })
})

describe("checkFile", () => {
  it("godtar en normal PowerPoint under grensen", () => {
    expect(checkFile({ name: "deck.pptx", size: 12 * MB, type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }, SLIDE_ACCEPT)).toBeNull()
  })
  it("godtar .pptx selv når nettleseren ikke satte MIME (utledes fra endelsen)", () => {
    expect(checkFile({ name: "deck.pptx", size: 5 * MB, type: "" }, SLIDE_ACCEPT)).toBeNull()
  })
  it("avviser en for stor presentasjon og tipser om PDF-eksport", () => {
    const msg = checkFile({ name: "stor.pptx", size: 80 * MB, type: "" }, SLIDE_ACCEPT)
    expect(msg).toContain("80.0 MB")
    expect(msg).toContain("maks 50 MB")
    expect(msg).toContain("PDF") // PowerPoint-spesifikt råd: eksporter til PDF
  })
  it("avviser for stort bilde med generisk råd (ikke PowerPoint-teksten)", () => {
    const msg = checkFile({ name: "svær.png", size: 60 * MB, type: "image/png" }, SLIDE_ACCEPT)
    expect(msg).toContain("maks 50 MB")
    expect(msg).not.toContain("PowerPoint")
  })
  it("avviser en filtype som ikke er tillatt", () => {
    expect(checkFile({ name: "arkiv.zip", size: 1 * MB, type: "application/zip" }, SLIDE_ACCEPT))
      .toContain("støttes ikke")
  })
})
