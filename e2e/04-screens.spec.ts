import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Skjermstyring", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("skjermoversikten laster med overskrift", async ({ page }) => {
    await page.goto(`${BASE}/admin/screens`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/application error/i)).not.toBeVisible()
  })

  test("ny skjerm-siden laster med steg 1 (velg butikk)", async ({ page }) => {
    await page.goto(`${BASE}/admin/screens/new`)
    await expect(page.getByText(/velg butikk/i)).toBeVisible({ timeout: 10000 })
  })

  test("ny skjerm-siden viser steg 2 med Generer-knapp", async ({ page }) => {
    await page.goto(`${BASE}/admin/screens/new`)
    // Knapp for å generere registreringskode er synlig
    const generateBtn = page.getByRole("button", { name: /generer/i })
    await expect(generateBtn).toBeVisible({ timeout: 10000 })
  })

  test("kan generere registreringskode", async ({ page }) => {
    await page.goto(`${BASE}/admin/screens/new`)
    const generateBtn = page.getByRole("button", { name: /generer/i })
    await generateBtn.click()
    // Etter generering: koden vises — bruker p.text-5xl.font-black (unik for kode-displayet)
    await expect(page.locator("p.text-5xl.font-black")).toBeVisible({
      timeout: 10000,
    })
  })
})
