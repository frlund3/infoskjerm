"use server"

import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"
import {
  verifyKioskPassword,
  kioskCookieName,
  kioskCookieToken,
} from "@/lib/kiosk/auth"

/**
 * Verifiserer kiosk-passord for en enhet og setter en langvarig httpOnly-cookie
 * ved treff (skjermer står på i lange perioder). Offentlig endepunkt — ingen
 * admin-innlogging, kun passordet beskytter visningen.
 */
export async function unlockKiosk(
  storeId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!storeId || !password) return { ok: false, error: "Skriv inn passord." }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("stores")
    .select("kiosk_password_hash")
    .eq("id", storeId)
    .maybeSingle()

  const hash = (data as { kiosk_password_hash: string | null } | null)?.kiosk_password_hash
  if (!hash) return { ok: true } // Ingen beskyttelse satt → åpen.

  if (!verifyKioskPassword(password, hash)) {
    return { ok: false, error: "Feil passord." }
  }

  const jar = await cookies()
  jar.set(kioskCookieName(storeId), kioskCookieToken(storeId, hash), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 år
  })
  return { ok: true }
}
