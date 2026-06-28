import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"
const TEST_EMAIL = process.env.TEST_EMAIL || "e2einfoskjerm@gmail.com"
const TEST_PASSWORD = process.env.TEST_PASSWORD || "E2eTestPassord123!"

test.describe("Autentisering", () => {
  test("login-siden vises ved besøk av /admin", async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    // AdminLayout redirecter til /login (ikke /admin/login)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test("viser feilmelding ved feil passord", async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill("feil@feil.no")
    await page.locator('input[type="password"]').fill("feilpassord")
    await page.getByRole("button", { name: /logg inn/i }).click()
    // Feilmeldingen fra login/page.tsx: "Feil e-post eller passord. Prøv igjen."
    await expect(page.getByText(/feil e-post eller passord/i)).toBeVisible({ timeout: 10000 })
  })

  test("kan logge inn med gyldige credentials", async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.getByRole("button", { name: /logg inn/i }).click()
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 })
  })
})
