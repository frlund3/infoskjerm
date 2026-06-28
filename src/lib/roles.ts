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

export const INVITABLE_ROLES: UserRole[] = ["chain_manager", "area_manager", "store_manager", "store_employee"]
