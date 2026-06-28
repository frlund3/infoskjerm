import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"
const CRON_SECRET = process.env.CRON_SECRET || "infoskjerm-cron-2026"

test.describe("Sikkerhet — tilgangskontroll", () => {
  test("uinnlogget bruker redirectes fra /admin til /login", async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test("uinnlogget bruker redirectes fra /admin/users til /login", async ({ page }) => {
    await page.goto(`${BASE}/admin/users`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test("uinnlogget bruker redirectes fra /admin/settings til /login", async ({ page }) => {
    await page.goto(`${BASE}/admin/settings`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test("uinnlogget bruker redirectes fra /admin/publish til /login", async ({ page }) => {
    await page.goto(`${BASE}/admin/publish`)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test("cron-endepunkt avviser manglende Authorization (401)", async ({ request }) => {
    const response = await request.get(`${BASE}/api/cron/promote-scheduled`)
    expect(response.status()).toBe(401)
  })

  test("cron-endepunkt avviser feil secret (401)", async ({ request }) => {
    const response = await request.get(`${BASE}/api/cron/promote-scheduled`, {
      headers: { Authorization: "Bearer feilsecret_xyz_123" },
    })
    expect(response.status()).toBe(401)
  })

  test("cron-endepunkt godtar riktig secret (ikke 401)", async ({ request }) => {
    const response = await request.get(`${BASE}/api/cron/promote-scheduled`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    // Skal returnere 200 (OK) — ikke 401
    expect(response.status()).not.toBe(401)
  })

  test("X-Content-Type-Options header er satt til nosniff", async ({ page }) => {
    const response = await page.goto(`${BASE}/login`)
    const headers = response?.headers() ?? {}
    expect(headers["x-content-type-options"]).toBe("nosniff")
  })

  test("X-Frame-Options header er satt (SAMEORIGIN eller DENY)", async ({ page }) => {
    const response = await page.goto(`${BASE}/login`)
    const headers = response?.headers() ?? {}
    const xfo = headers["x-frame-options"]
    expect(xfo).toMatch(/SAMEORIGIN|DENY/i)
  })
})
