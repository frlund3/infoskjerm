import { headers } from "next/headers"

// Kanonisk origin for lenker i e-post. Ved lokal testing utledes den fra
// request-host (localhost) slik at lenkene peker til dev-serveren. I alle andre
// miljøer brukes ALLTID det kanoniske domenet (NEXT_PUBLIC_APP_URL) — aldri det
// tilfeldige Vercel-aliaset (f.eks. *.vercel.app), som ellers ville havnet i
// e-postene når reset/invitasjon bes om via et slikt alias.
export async function getBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")

  // Lokal utvikling: behold request-host så e-postlenker peker til dev-serveren.
  if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return `http://${host}`
  }

  // Prod/preview: kanonisk domene, aldri request-host.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Siste fallback om env mangler.
  if (host) return `https://${host}`
  return "http://localhost:3000"
}
