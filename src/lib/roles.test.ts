import { describe, it, expect } from "vitest"
import {
  invitableRolesFor,
  canAdministerUsers,
  isStoreScopedRole,
  USER_MANAGER_ROLES,
  ROLE_RANK,
  type UserRole,
} from "./roles"

describe("invitableRolesFor", () => {
  it("super_admin og chain_manager kan invitere alle tildelbare roller", () => {
    const expected: UserRole[] = ["chain_manager", "area_manager", "store_manager"]
    expect(invitableRolesFor("super_admin")).toEqual(expected)
    expect(invitableRolesFor("chain_manager")).toEqual(expected)
  })

  it("butikk-admins kan KUN invitere enhetsadmin", () => {
    expect(invitableRolesFor("area_manager")).toEqual(["store_manager"])
    expect(invitableRolesFor("store_manager")).toEqual(["store_manager"])
  })

  it("butikk-admins kan aldri invitere seg oppover (ingen tenant/super)", () => {
    for (const actor of ["area_manager", "store_manager"] as const) {
      const allowed = invitableRolesFor(actor)
      expect(allowed).not.toContain("chain_manager")
      expect(allowed).not.toContain("super_admin")
      expect(allowed).not.toContain("area_manager")
    }
  })

  it("redaktør kan ikke invitere noen", () => {
    expect(invitableRolesFor("store_employee")).toEqual([])
  })
})

describe("canAdministerUsers", () => {
  it("kun tenant-brede admins kan endre rolle/slette/redigere tilgang", () => {
    expect(canAdministerUsers("super_admin")).toBe(true)
    expect(canAdministerUsers("chain_manager")).toBe(true)
    expect(canAdministerUsers("area_manager")).toBe(false)
    expect(canAdministerUsers("store_manager")).toBe(false)
    expect(canAdministerUsers("store_employee")).toBe(false)
  })
})

describe("isStoreScopedRole", () => {
  it("area/store er butikk-scopet, resten ikke", () => {
    expect(isStoreScopedRole("area_manager")).toBe(true)
    expect(isStoreScopedRole("store_manager")).toBe(true)
    expect(isStoreScopedRole("super_admin")).toBe(false)
    expect(isStoreScopedRole("chain_manager")).toBe(false)
  })
})

describe("USER_MANAGER_ROLES / ROLE_RANK", () => {
  it("redaktør ser ikke Brukere-siden", () => {
    expect(USER_MANAGER_ROLES).not.toContain("store_employee")
  })

  it("rangordningen er strengt synkende super → redaktør", () => {
    expect(ROLE_RANK.super_admin).toBeGreaterThan(ROLE_RANK.chain_manager)
    expect(ROLE_RANK.chain_manager).toBeGreaterThan(ROLE_RANK.area_manager)
    expect(ROLE_RANK.area_manager).toBeGreaterThan(ROLE_RANK.store_manager)
    expect(ROLE_RANK.store_manager).toBeGreaterThan(ROLE_RANK.store_employee)
  })
})
