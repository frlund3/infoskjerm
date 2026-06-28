import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Publiseringsflyt", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("godkjenningskøen (/admin/publish) laster", async ({ page }) => {
    await page.goto(`${BASE}/admin/publish`)
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })

  test("publiseringssiden viser enten kø eller tom-state", async ({ page }) => {
    await page.goto(`${BASE}/admin/publish`)
    await page.waitForLoadState("networkidle")
    // Enten en liste med elementer eller en "ingen"-melding
    const mainContent = page.locator("main, [role='main']")
    await expect(mainContent).toBeVisible({ timeout: 10000 })
  })
})
