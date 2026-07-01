import { getAdminContext } from "@/lib/admin/admin-context"
import { redirect } from "next/navigation"

export default async function PlattformLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role !== "super_admin") redirect("/admin")
  return <div className="p-6 md:p-10 max-w-5xl mx-auto">{children}</div>
}
