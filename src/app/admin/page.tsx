import { redirect } from "next/navigation"

// Skjermsystemet (drevet av det selvhostede skjermsystemet) er hovedflaten.
export default function AdminHome() {
  redirect("/admin/cms")
}
