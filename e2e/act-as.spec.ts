import { test, expect } from "@playwright/test"
import { loginAsAdmin, skipIfNoCredentials } from "./helpers"

const BASE = "http://localhost:3000"

// Bruker samme innloggingsmekanisme som resten av e2e-suiten (helpers.ts):
// TEST_EMAIL / TEST_PASSWORD mot /login. Testen forutsetter at denne kontoen
// har rollen super_admin i public.users og INGEN aktiv tenant-cookie satt
// (dvs. en fersk session — ellers har ImpersonationBanner/redirect-oppførselen
// allerede blitt utløst av en tidligere test).

test.describe("Superadmin — opptre som tenant", () => {
  test.beforeEach(async ({ page }) => {
    skipIfNoCredentials()
    await loginAsAdmin(page)
  })

  test("super_admin tvinges til plattform og kan opptre som en tenant", async ({ page }) => {
    await page.goto(`${BASE}/admin`)
    // Uten aktiv tenant redirectes super_admin til plattform:
    await expect(page).toHaveURL(/\/admin\/plattform/, { timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Plattform" })).toBeVisible()

    // Opptre som første tenant:
    await page.getByRole("button", { name: "Opptre som" }).first().click()
    await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 15000 })

    // Banneret vises:
    await expect(page.getByText("Opptrer som")).toBeVisible()

    // Avslutt tar oss tilbake til plattform:
    await page.getByRole("button", { name: "Avslutt" }).click()
    await expect(page).toHaveURL(/\/admin\/plattform/, { timeout: 15000 })
  })
})
