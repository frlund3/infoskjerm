import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Builder — modul-palette", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin/builder`)
    await page.waitForLoadState("networkidle")
  })

  test("builder-siden laster uten feil", async ({ page }) => {
    await expect(page.getByText(/application error|unhandled runtime error/i)).not.toBeVisible({
      timeout: 5000,
    })
    // Builder bruker ikke <h1> — sjekk at lagre/publiser-knapp er synlig
    await expect(page.getByRole("button", { name: /lagre|publiser|save/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test("modul-palette eller canvas er synlig", async ({ page }) => {
    // Builder kan ha enten en modul-liste eller et canvas-område
    const hasModuleList =
      (await page
        .locator("[class*='module'], [data-testid*='module'], button:has-text('Legg til')")
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false))
    const hasCanvas =
      (await page
        .locator("[class*='canvas'], [class*='builder'], [class*='preview']")
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false))
    expect(hasModuleList || hasCanvas).toBeTruthy()
  })

  test("builder har lagre/publiser-knapp", async ({ page }) => {
    const saveBtn = page.getByRole("button", { name: /lagre|publiser|save/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10000 })
  })
})
