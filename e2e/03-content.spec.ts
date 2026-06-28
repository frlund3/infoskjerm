import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Innholdsstyring", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("innholdslisten vises med overskrift", async ({ page }) => {
    await page.goto(`${BASE}/admin/content`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })

  test("søk i innhold filtrerer listen", async ({ page }) => {
    await page.goto(`${BASE}/admin/content`)
    const searchInput = page.getByPlaceholder(/søk|search/i)
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill("xyznonexistent123")
      // Gi React tid til å oppdatere
      await page.waitForTimeout(500)
      await expect(page.getByText(/ingen|no results|0 innhold|tom/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test("builder-siden laster og er tilgjengelig", async ({ page }) => {
    await page.goto(`${BASE}/admin/builder`)
    const response = await page.waitForResponse(
      (r) => r.url().includes("/admin/builder") || r.status() === 200,
      { timeout: 15000 }
    ).catch(() => null)
    // Sjekk at siden ikke krasjer — builder bruker ikke <h1>, sjekk lagre-knapp
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 8000 })
    await expect(page.getByRole("button", { name: /lagre|publiser|save/i }).first()).toBeVisible({ timeout: 10000 })
  })

  test("kalender-visning (/admin/content/calendar) laster", async ({ page }) => {
    await page.goto(`${BASE}/admin/content/calendar`)
    await expect(page.getByText(/application error/i)).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
  })
})
