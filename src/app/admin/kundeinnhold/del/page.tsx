import { redirect } from "next/navigation"

/**
 * Android del-meny-landing (PWA share_target). Når en lenke (f.eks. fra spar.no)
 * deles til Infoskjerm, lander den her — vi trekker ut URL-en og sender den rett
 * inn i masseimporten med lenken forhåndsutfylt.
 */

export const dynamic = "force-dynamic"

const URL_RE = /https?:\/\/[^\s]+/i

function extractUrl(params: { url?: string; text?: string; title?: string }): string | null {
  if (params.url && URL_RE.test(params.url)) return params.url.match(URL_RE)![0]
  if (params.text && URL_RE.test(params.text)) return params.text.match(URL_RE)![0]
  if (params.title && URL_RE.test(params.title)) return params.title.match(URL_RE)![0]
  return null
}

export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string; title?: string }>
}) {
  const params = await searchParams
  const url = extractUrl(params)
  if (url) {
    redirect(`/admin/kundeinnhold/bulk?lenker=${encodeURIComponent(url)}`)
  }
  redirect("/admin/kundeinnhold/bulk")
}
