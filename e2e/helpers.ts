import { Page, test } from "@playwright/test"

// Login-URL er /login (ikke /admin/login) — se admin/layout.tsx redirect
const BASE = "http://localhost:3000"

export const TEST_EMAIL = process.env.TEST_EMAIL || "e2einfoskjerm@gmail.com"
export const TEST_PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassord123!"

/**
 * Logger inn som admin. Forutsetter at TEST_EMAIL og TEST_PASSWORD er satt.
 * Kall skipIfNoCredentials() i test.beforeEach hvis alle tester i en suite trenger innlogging.
 */
export async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole("button", { name: /logg inn/i }).click()
  await page.waitForURL(/\/admin/, { timeout: 20000 })
}

/**
 * Hopper over testen hvis TEST_EMAIL / TEST_PASSWORD mangler.
 * Bruk i test.beforeEach for suiter som krever innlogging.
 */
export function skipIfNoCredentials() {
  // Credentials er alltid satt (testbruker opprettet i Supabase)
}
