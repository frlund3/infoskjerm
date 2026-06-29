import { headers } from "next/headers"

// Kanonisk origin for lenker i e-post. Utledes fra request-headers slik at den
// blir riktig i alle miljøer (localhost ved lokal testing, prod-domenet i prod).
// Faller tilbake til NEXT_PUBLIC_APP_URL om headers mangler.
export async function getBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
