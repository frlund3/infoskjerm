import { scryptSync, randomBytes, createHmac, timingSafeEqual } from "node:crypto"

/**
 * Passordbeskyttelse for privat kiosk-visning (/vis/<enhet>).
 *
 * - Passord lagres som scrypt-hash `salt:hash` (hex) i stores.kiosk_password_hash.
 * - Etter riktig passord settes en httpOnly-cookie hvis verdi er en HMAC av
 *   (storeId + lagret hash) med en server-hemmelighet. Endres passordet, endres
 *   hashen → gamle cookies blir automatisk ugyldige. Cookien avslører ikke passordet.
 */

const SCRYPT_KEYLEN = 32

function hmacKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler (kiosk-cookie-signering)")
  return key
}

/** scrypt-hash `salt:hash` (hex) for lagring. */
export function hashKioskPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN)
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

/** Konstant-tids-sjekk av passord mot lagret `salt:hash`. */
export function verifyKioskPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, "hex")
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** Cookie-navn per enhet. */
export function kioskCookieName(storeId: string): string {
  return `kiosk_${storeId}`
}

/** Forventet cookie-verdi utledet fra lagret hash (endres når passordet endres). */
export function kioskCookieToken(storeId: string, storedHash: string): string {
  return createHmac("sha256", hmacKey()).update(`${storeId}:${storedHash}`).digest("base64url")
}

/** Konstant-tids-sammenligning av cookie mot forventet token. */
export function kioskCookieValid(cookieValue: string | undefined, storeId: string, storedHash: string): boolean {
  if (!cookieValue) return false
  const expected = Buffer.from(kioskCookieToken(storeId, storedHash))
  const actual = Buffer.from(cookieValue)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
