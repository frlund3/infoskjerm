/**
 * Deck = en opplastet fil som vises som roterende sidebilder på skjermene
 * (kundeavis-PDF eller PowerPoint). Begge rendres server-side til body.pages[]
 * (maks 6 sider) og vises av PdfFlyer. PowerPoint kan IKKE rasteriseres i
 * nettleseren, så en PPT uten ferdige pages viser en vente-tilstand — aldri
 * client-side pdf.js-fallback (den gjelder kun PDF).
 */

/** Trekker ut filendelsen (uten query-string), lowercase. */
function ext(url?: string | null): string {
  return (url ?? "").toLowerCase().split("?")[0].split("#")[0]
}

/** True når URL-en peker på en PDF-fil. */
export function isPdfUrl(url?: string | null): boolean {
  return ext(url).endsWith(".pdf")
}

/** True når URL-en peker på en PowerPoint (.pptx eller .ppt). */
export function isPptUrl(url?: string | null): boolean {
  const e = ext(url)
  return e.endsWith(".pptx") || e.endsWith(".ppt")
}

/** True for enhver fil som skal vises som roterende sidebilder (PDF eller PPT). */
export function isDeckUrl(url?: string | null): boolean {
  return isPdfUrl(url) || isPptUrl(url)
}
