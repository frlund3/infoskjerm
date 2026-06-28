import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"

test.describe("Preview display", () => {
  test("preview med ugyldig UUID gir 404 eller not-found-side", async ({ page }) => {
    const response = await page.goto(
      `${BASE}/preview/00000000-0000-0000-0000-000000000000`
    )
    // Enten HTTP 404 eller en side som sier "ikke funnet"
    const status = response?.status() ?? 0
    const bodyText = await page.textContent("body") ?? ""
    const isNotFound =
      status === 404 || /ikke funnet|not found|404|no content/i.test(bodyText)
    expect(isNotFound).toBeTruthy()
  })

  test("screen-display (/screen) er en offentlig rute", async ({ page }) => {
    // /screen-ruten er for Raspberry Pi-kiosker — skal ikke redirecte til login
    const response = await page.goto(`${BASE}/screen`)
    // Skal ikke kreve innlogging
    const currentUrl = page.url()
    expect(currentUrl).not.toMatch(/\/login/)
  })
})
