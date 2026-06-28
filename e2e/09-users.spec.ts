import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Brukerstyring", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("brukerlisten laster med overskrift", async ({ page }) => {
    await page.goto(`${BASE}/admin/users`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/application error/i)).not.toBeVisible()
  })

  test("brukersiden viser innhold eller tom-state", async ({ page }) => {
    await page.goto(`${BASE}/admin/users`)
    await page.waitForLoadState("networkidle")
    const mainContent = page.locator("main, [role='main']")
    await expect(mainContent).toBeVisible({ timeout: 10000 })
  })
})
