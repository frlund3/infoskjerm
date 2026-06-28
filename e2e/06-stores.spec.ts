import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Butikkstyring", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("butikkoversikt laster med overskrift", async ({ page }) => {
    await page.goto(`${BASE}/admin/stores`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/application error/i)).not.toBeVisible()
  })

  test("butikksiden viser innhold (kjeder eller tom-state)", async ({ page }) => {
    await page.goto(`${BASE}/admin/stores`)
    await page.waitForLoadState("networkidle")
    const mainContent = page.locator("main, [role='main']")
    await expect(mainContent).toBeVisible({ timeout: 10000 })
  })
})
