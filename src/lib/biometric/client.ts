/**
 * Lokal biometrisk lås via WebAuthn (platform-authenticator: Face ID / Touch ID).
 *
 * Dette er en LOKAL gate, ikke server-auth: vi registrerer en plattform-passkey
 * og krever en vellykket biometrisk bekreftelse for å låse opp appen. Supabase-
 * sesjonen er allerede gyldig (vanlig innlogging) — biometrien er kun en lås
 * foran. Faller tilbake til passord når sesjonen utløper.
 */

const CRED_KEY = "biometric-credential-id"
const ENABLED_KEY = "biometric-enabled"

function randomBytes(n: number): BufferSource {
  const a = new Uint8Array(n)
  crypto.getRandomValues(a)
  return a as BufferSource
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === "1" && !!localStorage.getItem(CRED_KEY)
  } catch {
    return false
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/** Registrerer en plattform-passkey og slår på låsen. */
export async function registerBiometric(label: string): Promise<boolean> {
  if (!(await isBiometricSupported())) return false
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "Infoskjerm", id: location.hostname },
        user: { id: randomBytes(16), name: label, displayName: label },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null
    if (!cred) return false
    localStorage.setItem(CRED_KEY, bufToB64url(cred.rawId))
    localStorage.setItem(ENABLED_KEY, "1")
    return true
  } catch {
    return false
  }
}

/** Ber om biometrisk bekreftelse mot den registrerte passkeyen. */
export async function verifyBiometric(): Promise<boolean> {
  try {
    const id = localStorage.getItem(CRED_KEY)
    if (!id) return false
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ id: b64urlToBytes(id) as BufferSource, type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    })
    return !!assertion
  } catch {
    return false
  }
}

export function disableBiometric(): void {
  try {
    localStorage.removeItem(CRED_KEY)
    localStorage.removeItem(ENABLED_KEY)
  } catch {}
}
