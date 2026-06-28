import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

test.describe("Spillelister", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("spillelisteoversikt laster med overskrift", async ({ page }) => {
    await page.goto(`${BASE}/admin/playlists`)
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/application error/i)).not.toBeVisible()
  })

  test("ny spilleliste-knapp er synlig", async ({ page }) => {
    await page.goto(`${BASE}/admin/playlists`)
    // Sjekk at en opprett/ny-knapp finnes
    const newBtn = page.getByRole("button", { name: /ny|opprett|legg til/i }).first()
    const newLink = page.getByRole("link", { name: /ny|opprett|legg til/i }).first()
    const btnVisible = await newBtn.isVisible({ timeout: 3000 }).catch(() => false)
    const linkVisible = await newLink.isVisible({ timeout: 3000 }).catch(() => false)
    expect(btnVisible || linkVisible).toBeTruthy()
  })
})
