import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

// Alle admin-ruter basert på src/app/admin/ mappestruktur
const ADMIN_PAGES = [
  { path: "/admin", name: "Dashboard" },
  { path: "/admin/content", name: "Innhold" },
  { path: "/admin/screens", name: "Skjermer" },
  { path: "/admin/playlists", name: "Spillelister" },
  { path: "/admin/stores", name: "Butikker" },
  { path: "/admin/users", name: "Brukere" },
  { path: "/admin/publish", name: "Publiser" },
  { path: "/admin/tags", name: "Tags" },
  { path: "/admin/zones", name: "Soner" },
  { path: "/admin/settings", name: "Innstillinger" },
]

test.describe("Admin-navigasjon", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  for (const { path, name } of ADMIN_PAGES) {
    test(`${name} (${path}) laster uten application error`, async ({ page }) => {
      const response = await page.goto(`${BASE}${path}`)
      // Siden skal returnere 200 (ikke 500)
      expect(response?.status()).not.toBe(500)
      // Ingen Next.js error boundary skal ha trigget
      await expect(page.getByText(/application error|unhandled runtime error/i)).not.toBeVisible({ timeout: 5000 })
      // En overskrift skal være synlig
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    })
  }

  test("rotsti / redirecter til /admin", async ({ page }) => {
    await page.goto(`${BASE}/`)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 })
  })
})
