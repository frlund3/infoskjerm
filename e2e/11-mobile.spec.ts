import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

// Disse testene kjøres med Mobile Chrome og Mobile Safari projects
test.describe("Mobil admin-tilpasning", () => {
  test.beforeEach(() => {
    skipIfNoCredentials()
  })

  test("dashboard laster på mobil uten application error", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin`)
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })

  test("ingen horisontal overflow på dashboard (mobil)", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin`)
    await page.waitForLoadState("networkidle")

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    // Toleranse på 2px for border/rounding
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 2)
  })

  test("innholdssiden er tilgjengelig på mobil", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin/content`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })

  test("skjermsiden er tilgjengelig på mobil", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin/screens`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })

  test("touch-targets for knapper er minst 36px høye", async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto(`${BASE}/admin`)

    // Ekskluder Next.js dev-overlay knapper — kun admin-UI-knapper
    const buttons = await page.locator("header button, aside button, main button").all()
    const visibleButtons = []
    for (const btn of buttons.slice(0, 8)) {
      const box = await btn.boundingBox()
      if (box && box.width > 0 && box.height > 0) {
        visibleButtons.push({ height: box.height, width: box.width })
      }
    }

    for (const { height } of visibleButtons) {
      // WCAG 2.5.5: minimum 44px anbefalt, 36px absolutt minimum
      expect(height).toBeGreaterThanOrEqual(36)
    }
  })
})
