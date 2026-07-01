export type UserRole = "super_admin" | "chain_manager" | "area_manager" | "store_manager" | "store_employee"

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  chain_manager: "Tenant Admin",
  area_manager: "Flerenhetsadmin",
  store_manager: "Enhetsadmin",
  store_employee: "Redaktør",
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Plattformadministrator med full tilgang",
  chain_manager: "Full tilgang til alle enheter, innhold og brukere",
  area_manager: "Administrerer innhold og skjermer for flere enheter",
  store_manager: "Administrerer innhold og skjermer for én enhet",
  store_employee: "Oppretter og redigerer innholdsutkast",
}

// Redaktør (store_employee) er utfaset som tildelbar rolle. Enum-verdien beholdes
// for typetrygghet/historiske rader, men kan ikke lenger inviteres eller velges.
export const INVITABLE_ROLES: UserRole[] = ["chain_manager", "area_manager", "store_manager"]

// Rang i rollehierarkiet (høyere = mer tilgang). Brukes til å hindre at en
// butikk-admin eskalerer eller rører brukere over seg selv.
export const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 4,
  chain_manager: 3,
  area_manager: 2,
  store_manager: 1,
  store_employee: 0,
}

// Roller som ser Brukere-siden. Butikk-scopede roller (area/store) ser kun
// brukere i egne enheter og kan kun invitere enhets-roller til egne enheter.
export const USER_MANAGER_ROLES: UserRole[] = [
  "super_admin",
  "chain_manager",
  "area_manager",
  "store_manager",
]

// Er rollen scopet til konkrete butikker (ser/handler kun på egne enheter)?
export function isStoreScopedRole(role: UserRole): boolean {
  return role === "area_manager" || role === "store_manager"
}

// Kan rollen endre andres rolle, slette brukere og redigere butikktilgang på
// eksisterende brukere? Kun tenant-brede admins — butikk-admins kan kun invitere.
export function canAdministerUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "chain_manager"
}

// Hvilke roller kan `role` invitere? Butikk-admins (area/store) kan kun opprette
// enhetsadmin — og kun til egne butikker (håndheves i server-action, ikke her).
export function invitableRolesFor(role: UserRole): UserRole[] {
  if (role === "super_admin" || role === "chain_manager") return INVITABLE_ROLES
  if (role === "area_manager" || role === "store_manager") return ["store_manager"]
  return []
}

// Kan rollen målrette innhold til ALLE butikker / på tvers (vs. kun egne enheter)?
// Butikk-roller (area/store) ser kun egne butikker i «Vis på» — RLS håndhever det
// uansett, dette er UI-speilingen.
export function canTargetAllStores(role: UserRole): boolean {
  return role === "super_admin" || role === "chain_manager"
}
